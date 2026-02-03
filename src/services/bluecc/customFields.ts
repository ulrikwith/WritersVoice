// Blue.cc Custom Fields Service
// Manages custom field creation and value assignment

import blueCore from './core';
import type { ApiResponse, CustomField, CustomFieldType } from './types';

// Cache for custom field IDs
const fieldIdCache = new Map<string, string>();

class CustomFieldsService {
  /**
   * Get or create a custom field by name
   */
  async getOrCreateField(
    name: string,
    type: CustomFieldType = 'TEXT'
  ): Promise<ApiResponse<CustomField>> {
    // Check cache first
    if (fieldIdCache.has(name)) {
      const cachedId = fieldIdCache.get(name)!;
      return { success: true, data: { id: cachedId, name, type } as CustomField };
    }

    // Query for existing field
    const query = `
      query GetCustomFields {
        customFields {
          id
          name
          type
          projectId
        }
      }
    `;

    const result = await blueCore.query<{ customFields: CustomField[] }>(query);

    if (result.success && result.data?.customFields) {
      const existingField = result.data.customFields.find((f) => f.name === name);
      if (existingField) {
        fieldIdCache.set(name, existingField.id);
        return { success: true, data: existingField };
      }
    }

    // Create new field if not found
    return this.createField(name, type);
  }

  /**
   * Create a new custom field
   */
  async createField(
    name: string,
    type: CustomFieldType = 'TEXT',
    options?: string[]
  ): Promise<ApiResponse<CustomField>> {
    const mutation = `
      mutation CreateCustomField($input: CreateCustomFieldInput!) {
        createCustomField(input: $input) {
          id
          name
          type
          projectId
        }
      }
    `;

    const input: Record<string, unknown> = { name, type };
    if (options && (type === 'SELECT' || type === 'MULTI_SELECT')) {
      input.options = options;
    }

    const result = await blueCore.query<{ createCustomField: CustomField }>(
      mutation,
      { input }
    );

    if (result.success && result.data?.createCustomField) {
      const field = result.data.createCustomField;
      fieldIdCache.set(name, field.id);
      console.log(`[Blue.cc] Created custom field: ${name}`);
      return { success: true, data: field };
    }

    return {
      success: false,
      error: result.error || 'Failed to create custom field',
    };
  }

  /**
   * Set a custom field value on a todo
   */
  async setTodoValue(
    todoId: string,
    fieldName: string,
    value: unknown
  ): Promise<ApiResponse<void>> {
    // Ensure field exists
    const fieldResult = await this.getOrCreateField(
      fieldName,
      this.inferFieldType(value)
    );

    if (!fieldResult.success || !fieldResult.data) {
      return { success: false, error: 'Could not get or create field' };
    }

    const fieldId = fieldResult.data.id;

    // Serialize value if it's an object
    const serializedValue =
      typeof value === 'object' ? JSON.stringify(value) : String(value);

    const mutation = `
      mutation SetCustomFieldValue($input: SetCustomFieldValueInput!) {
        setCustomFieldValue(input: $input) {
          todoId
          fieldId
          value
        }
      }
    `;

    const result = await blueCore.query<{
      setCustomFieldValue: { todoId: string };
    }>(mutation, {
      input: {
        todoId,
        fieldId,
        value: serializedValue,
      },
    });

    return { success: result.success, error: result.error };
  }

  /**
   * Get a custom field value from a todo
   */
  async getTodoValue<T = string>(
    todoId: string,
    fieldName: string
  ): Promise<ApiResponse<T | null>> {
    const todoResult = await blueCore.getTodo(todoId);

    if (!todoResult.success || !todoResult.data) {
      return { success: false, error: 'Todo not found' };
    }

    const todo = todoResult.data;
    const fieldValue = todo.customFieldValues?.find(
      (cfv) => cfv.field.name === fieldName
    );

    if (!fieldValue) {
      return { success: true, data: null };
    }

    // Try to parse as JSON
    try {
      const parsed = JSON.parse(fieldValue.value) as T;
      return { success: true, data: parsed };
    } catch {
      // Return as-is if not JSON
      return { success: true, data: fieldValue.value as unknown as T };
    }
  }

  /**
   * Get all custom field values for a todo
   */
  async getAllTodoValues(
    todoId: string
  ): Promise<ApiResponse<Record<string, unknown>>> {
    const todoResult = await blueCore.getTodo(todoId);

    if (!todoResult.success || !todoResult.data) {
      return { success: false, error: 'Todo not found' };
    }

    const values: Record<string, unknown> = {};

    todoResult.data.customFieldValues?.forEach((cfv) => {
      try {
        values[cfv.field.name] = JSON.parse(cfv.value);
      } catch {
        values[cfv.field.name] = cfv.value;
      }
    });

    return { success: true, data: values };
  }

  /**
   * Delete a custom field value from a todo
   */
  async deleteTodoValue(
    todoId: string,
    fieldName: string
  ): Promise<ApiResponse<void>> {
    const fieldResult = await this.getOrCreateField(fieldName);

    if (!fieldResult.success || !fieldResult.data) {
      return { success: false, error: 'Field not found' };
    }

    const mutation = `
      mutation DeleteCustomFieldValue($input: DeleteCustomFieldValueInput!) {
        deleteCustomFieldValue(input: $input) {
          todoId
          fieldId
        }
      }
    `;

    const result = await blueCore.query<{ deleteCustomFieldValue: unknown }>(
      mutation,
      {
        input: {
          todoId,
          fieldId: fieldResult.data.id,
        },
      }
    );

    return { success: result.success, error: result.error };
  }

  /**
   * Ensure all required BookArchitect custom fields exist
   */
  async ensureBookArchitectFields(): Promise<ApiResponse<void>> {
    const fieldsToCreate: Array<{ name: string; type: CustomFieldType }> = [
      // Voice Journey Fields
      { name: 'VoiceJourney_Phase', type: 'SELECT' },
      { name: 'VoiceJourney_Progress', type: 'JSON' },
      { name: 'VoiceJourney_StoneData', type: 'JSON' },
      { name: 'VoiceJourney_Resonance', type: 'JSON' },
      { name: 'VoiceJourney_UnlockedFeatures', type: 'JSON' },

      // Book/Chapter Fields
      { name: 'BookArchitect_BookMetadata', type: 'JSON' },
      { name: 'BookArchitect_ChapterMetadata', type: 'JSON' },
      { name: 'BookArchitect_GoogleDriveFileId', type: 'TEXT' },

      // Community Fields
      { name: 'BookArchitect_CohortId', type: 'TEXT' },
      { name: 'BookArchitect_UserProfile', type: 'JSON' },
    ];

    for (const field of fieldsToCreate) {
      await this.getOrCreateField(field.name, field.type);
    }

    console.log('[Blue.cc] All BookArchitect custom fields ensured');
    return { success: true };
  }

  /**
   * Infer field type from value
   */
  private inferFieldType(value: unknown): CustomFieldType {
    if (typeof value === 'object' && value !== null) {
      return 'JSON';
    }
    if (typeof value === 'number') {
      return 'NUMBER';
    }
    if (typeof value === 'boolean') {
      return 'BOOLEAN';
    }
    if (value instanceof Date) {
      return 'DATE';
    }
    return 'TEXT';
  }

  /**
   * Clear the field ID cache
   */
  clearCache(): void {
    fieldIdCache.clear();
  }
}

// Singleton instance
export const customFieldsService = new CustomFieldsService();

export default customFieldsService;
