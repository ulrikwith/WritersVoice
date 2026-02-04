// Blue.cc Core Service
// GraphQL client and authentication management
// Based on Blue.cc API schema: Company → Project → TodoList hierarchy

import { GraphQLClient } from 'graphql-request';
import type { BlueConfig, ApiResponse, TodoList, Todo } from './types';

// Default API endpoint
const DEFAULT_ENDPOINT = 'https://api.blue.cc/graphql';

/**
 * Raw Blue.cc Todo from API (uses 'done' not 'completed')
 */
interface RawTodo {
  id: string;
  title: string;
  text?: string;
  done: boolean;
  position: number;
  parentId?: string;
  createdAt?: string;
  updatedAt?: string;
  tags?: Array<{ id: string; title: string; color?: string }>;
  children?: RawTodo[];
}

class BlueCoreService {
  private client: GraphQLClient | null = null;
  private config: BlueConfig | null = null;
  private companyId: string | null = null;
  private projectId: string | null = null;
  private journeyListId: string | null = null;
  private booksListId: string | null = null;
  private cohortListId: string | null = null;

  /**
   * Initialize the Blue.cc client with credentials
   */
  initialize(config: BlueConfig): void {
    this.config = config;

    const headers: Record<string, string> = {
      'X-Bloo-Token-ID': config.tokenId,
      'X-Bloo-Token-Secret': config.secretId,
      'Content-Type': 'application/json',
    };

    this.client = new GraphQLClient(config.endpoint || DEFAULT_ENDPOINT, {
      headers,
    });

    console.log('[Blue.cc] Client initialized');
  }

  /**
   * Check if client is initialized
   */
  isInitialized(): boolean {
    return this.client !== null && this.config !== null;
  }

  /**
   * Get the GraphQL client (throws if not initialized)
   */
  getClient(): GraphQLClient {
    if (!this.client) {
      throw new Error('Blue.cc client not initialized. Call initialize() first.');
    }
    return this.client;
  }

  /**
   * Map raw Blue.cc todo to our Todo type
   * Blue.cc uses 'done', we use 'completed'
   */
  private mapRawTodo(raw: RawTodo): Todo {
    return {
      id: raw.id,
      todoListId: '', // Not always returned by API
      title: raw.title,
      text: raw.text,
      completed: raw.done,
      position: raw.position,
      parentId: raw.parentId,
      createdAt: raw.createdAt || new Date().toISOString(),
      updatedAt: raw.updatedAt || new Date().toISOString(),
      tags: raw.tags?.map((t) => ({ id: t.id, name: t.title, color: t.color })),
      children: raw.children?.map((c) => this.mapRawTodo(c)),
    };
  }

  /**
   * Set company and project headers for subsequent requests
   */
  private setContextHeaders(): void {
    if (!this.client) return;

    if (this.companyId) {
      this.client.setHeader('X-Bloo-Company-ID', this.companyId);
    }
    if (this.projectId) {
      this.client.setHeader('X-Bloo-Project-ID', this.projectId);
    }
  }

  /**
   * Execute a GraphQL query/mutation
   */
  async query<T>(
    query: string,
    variables?: Record<string, unknown>
  ): Promise<ApiResponse<T>> {
    try {
      const client = this.getClient();
      this.setContextHeaders();
      const data = await client.request<T>(query, variables);
      return { success: true, data };
    } catch (error) {
      console.error('[Blue.cc] Query error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Ensure workspace exists and get/create required lists
   * Blue.cc hierarchy: Company → Project → TodoList
   */
  async ensureWorkspace(): Promise<ApiResponse<{ workspaceId: string }>> {
    // Step 1: Get Company and Project from recentProjects
    const workspaceQuery = `
      query GetRecentProjects {
        recentProjects {
          id
          uid
          name
          company {
            id
            uid
            name
          }
        }
      }
    `;

    const result = await this.query<{
      recentProjects: Array<{
        id: string;
        uid: string;
        name: string;
        company: { id: string; uid: string; name: string };
      }>;
    }>(workspaceQuery);

    if (!result.success || !result.data?.recentProjects?.[0]) {
      return { success: false, error: 'Could not retrieve workspace. Make sure you have at least one project in Blue.cc.' };
    }

    const project = result.data.recentProjects[0];
    this.companyId = project.company.id;
    this.projectId = project.id;

    console.log('[Blue.cc] Workspace found:', {
      company: project.company.name,
      project: project.name,
    });

    // Ensure required lists exist
    await this.ensureRequiredLists();

    return { success: true, data: { workspaceId: this.projectId } };
  }

  /**
   * Create or get required todo lists
   *
   * Best Practice for Production:
   * - Pre-create lists in Blue.cc dashboard
   * - Set list IDs in environment variables
   * - This ensures consistent list IDs across deployments
   *
   * For Development:
   * - Lists are auto-created if not configured
   * - Names follow pattern: WritersVoice_{Domain}
   */
  private async ensureRequiredLists(): Promise<void> {
    // 1. Try to use configured IDs from environment/config (PREFERRED)
    if (this.config?.journeyListId) {
      this.journeyListId = this.config.journeyListId;
      console.log('[Blue.cc] Using configured journeyListId');
    }
    if (this.config?.booksListId) {
      this.booksListId = this.config.booksListId;
      console.log('[Blue.cc] Using configured booksListId');
    }
    if (this.config?.cohortListId) {
      this.cohortListId = this.config.cohortListId;
      console.log('[Blue.cc] Using configured cohortListId');
    }

    // If all are set via config, we're ready (production best practice)
    if (this.journeyListId && this.booksListId && this.cohortListId) {
      console.log('[Blue.cc] All list IDs configured - production mode');
      return;
    }

    // WARN: Auto-discovery/creation mode (development only)
    console.warn('[Blue.cc] Some list IDs not configured - using auto-discovery mode');
    console.warn('[Blue.cc] For production, set VITE_BLUE_*_LIST_ID environment variables');

    // 2. Otherwise, discover or create them
    // Get existing lists for this project
    const listsQuery = `
      query GetTodoLists($projectId: String!) {
        todoLists(projectId: $projectId) {
          id
          title
        }
      }
    `;

    const result = await this.query<{ todoLists: TodoList[] }>(listsQuery, {
      projectId: this.projectId,
    });

    if (!result.success || !result.data?.todoLists) {
      throw new Error('Could not retrieve todo lists');
    }

    const lists = result.data.todoLists;

    // Find or create Journey list if not configured
    if (!this.journeyListId) {
      const journeyList = lists.find((l) => l.title === 'WritersVoice_Journeys');
      if (journeyList) {
        this.journeyListId = journeyList.id;
      } else {
        this.journeyListId = await this.createList('WritersVoice_Journeys');
      }
    }

    // Find or create Books list if not configured
    if (!this.booksListId) {
      const booksList = lists.find((l) => l.title === 'WritersVoice_Books');
      if (booksList) {
        this.booksListId = booksList.id;
      } else {
        this.booksListId = await this.createList('WritersVoice_Books');
      }
    }

    // Find or create Community list if not configured
    if (!this.cohortListId) {
      const cohortList = lists.find((l) => l.title === 'WritersVoice_Community');
      if (cohortList) {
        this.cohortListId = cohortList.id;
      } else {
        this.cohortListId = await this.createList('WritersVoice_Community');
      }
    }

    console.log('[Blue.cc] Lists ready:', {
      journeyListId: this.journeyListId,
      booksListId: this.booksListId,
      cohortListId: this.cohortListId,
    });
  }

  /**
   * Create a new todo list
   */
  private async createList(title: string): Promise<string> {
    const mutation = `
      mutation CreateList($input: CreateTodoListInput!) {
        createTodoList(input: $input) {
          id
          title
        }
      }
    `;

    const result = await this.query<{ createTodoList: { id: string } }>(mutation, {
      input: {
        title,
        projectId: this.projectId,
        position: 0, // Required field - position in the list order
      },
    });

    if (!result.success || !result.data?.createTodoList?.id) {
      throw new Error(`Failed to create list: ${title}`);
    }

    console.log(`[Blue.cc] Created list: ${title}`);
    return result.data.createTodoList.id;
  }

  /**
   * Get Journey list ID
   * @throws Error if list ID could not be obtained
   */
  async getJourneyListId(): Promise<string> {
    if (!this.journeyListId) {
      await this.ensureWorkspace();
    }
    if (!this.journeyListId) {
      throw new Error('[Blue.cc] Failed to get journey list ID. Check configuration.');
    }
    return this.journeyListId;
  }

  /**
   * Get Books list ID
   * @throws Error if list ID could not be obtained
   */
  async getBooksListId(): Promise<string> {
    if (!this.booksListId) {
      await this.ensureWorkspace();
    }
    if (!this.booksListId) {
      throw new Error('[Blue.cc] Failed to get books list ID. Check configuration.');
    }
    return this.booksListId;
  }

  /**
   * Get Community list ID
   * @throws Error if list ID could not be obtained
   */
  async getCohortListId(): Promise<string> {
    if (!this.cohortListId) {
      await this.ensureWorkspace();
    }
    if (!this.cohortListId) {
      throw new Error('[Blue.cc] Failed to get cohort list ID. Check configuration.');
    }
    return this.cohortListId;
  }

  /**
   * Get a todo by ID
   * Note: Blue.cc uses 'done' not 'completed', and 'text' for description
   */
  async getTodo(todoId: string): Promise<ApiResponse<Todo>> {
    const query = `
      query GetTodo($id: String!) {
        todo(id: $id) {
          id
          title
          text
          done
          position
          createdAt
          updatedAt
          tags {
            id
            title
            color
          }
        }
      }
    `;

    const result = await this.query<{ todo: RawTodo }>(query, { id: todoId });

    if (result.success && result.data?.todo) {
      // Map raw Blue.cc response to our Todo type
      return { success: true, data: this.mapRawTodo(result.data.todo) };
    }

    return { success: false, error: 'Todo not found' };
  }

  /**
   * Update a todo's title and/or text
   * IMPORTANT: Blue.cc uses 'editTodo' mutation with 'EditTodoInput', not 'updateTodo'!
   * EditTodoInput uses 'text' field for description (unlike CreateTodoInput which uses 'description')
   */
  async updateTodo(
    todoId: string,
    updates: { title?: string; text?: string; completed?: boolean }
  ): Promise<ApiResponse<Todo>> {
    // Handle 'done' status separately if needed - use updateTodoDoneStatus mutation
    if (updates.completed !== undefined) {
      const doneResult = await this.query<{ updateTodoDoneStatus: RawTodo }>(
        `mutation UpdateDoneStatus($todoId: String!) {
          updateTodoDoneStatus(todoId: $todoId) {
            id
            done
          }
        }`,
        { todoId }
      );
      // This toggles done status - if we need to set a specific value, we might need different logic
      if (!doneResult.success) {
        console.warn('[Blue.cc] Failed to update done status');
      }
    }

    // Only call editTodo if we have title or text updates
    if (updates.title !== undefined || updates.text !== undefined) {
      const mutation = `
        mutation EditTodo($input: EditTodoInput!) {
          editTodo(input: $input) {
            id
            title
            text
            done
            position
            updatedAt
          }
        }
      `;

      const input: Record<string, unknown> = { todoId };

      if (updates.title !== undefined) {
        input.title = updates.title;
      }
      if (updates.text !== undefined) {
        // EditTodoInput uses 'text' field
        input.text = updates.text;
      }

      const result = await this.query<{ editTodo: RawTodo }>(mutation, { input });

      if (result.success && result.data?.editTodo) {
        return { success: true, data: this.mapRawTodo(result.data.editTodo) };
      }

      return { success: false, error: result.error || 'Failed to update todo' };
    }

    // If only completed was updated, fetch the current todo
    return this.getTodo(todoId);
  }

  /**
   * Delete a todo
   * Blue.cc uses input pattern: { todoId: string }
   */
  async deleteTodo(todoId: string): Promise<ApiResponse<void>> {
    const mutation = `
      mutation DeleteTodo($input: DeleteTodoInput!) {
        deleteTodo(input: $input) {
          success
        }
      }
    `;

    const result = await this.query<{ deleteTodo: { success: boolean } }>(mutation, {
      input: { todoId },
    });

    return { success: result.success };
  }

  /**
   * Search todos in a list
   * Blue.cc uses todoList(id) query to get todos
   * Uses 'done' not 'completed'
   */
  async searchTodos(
    listId: string,
    searchTerm: string,
    // limit param reserved for future server-side pagination
    _limit?: number
  ): Promise<ApiResponse<Todo[]>> {
    void _limit; // Currently unused - client-side filtering
    // Use todoList(id) pattern to fetch todos, then filter client-side
    const query = `
      query SearchTodos($todoListId: String!) {
        todoList(id: $todoListId) {
          todos {
            id
            title
            text
            html
            done
            position
            tags {
              id
              title
              color
            }
            customFields {
              id
              name
              value
            }
            createdAt
            updatedAt
          }
        }
      }
    `;

    const result = await this.query<{ todoList: { todos: RawTodo[] } }>(query, {
      todoListId: listId,
    });

    if (result.success && result.data?.todoList?.todos) {
      // Filter client-side by search term
      const searchLower = searchTerm.toLowerCase();
      const filteredTodos = result.data.todoList.todos
        .filter((t) =>
          t.title.toLowerCase().includes(searchLower) ||
          (t.text && t.text.toLowerCase().includes(searchLower))
        )
        .map((t) => this.mapRawTodo(t));

      return { success: true, data: filteredTodos };
    }

    return { success: false, error: 'Search failed', data: [] };
  }

  /**
   * Get all todos in a list
   * Blue.cc uses todoList(id) query to get todos, not todos(todoListId)
   * Uses 'done' not 'completed'
   */
  async getTodos(
    listId: string,
    // limit param reserved for future server-side pagination
    _limit?: number
  ): Promise<ApiResponse<Todo[]>> {
    void _limit; // Currently unused - API returns all todos
    const query = `
      query GetTodos($todoListId: String!) {
        todoList(id: $todoListId) {
          todos {
            id
            title
            text
            html
            done
            position
            tags {
              id
              title
              color
            }
            customFields {
              id
              name
              value
            }
            createdAt
            updatedAt
            duedAt
            startedAt
          }
        }
      }
    `;

    const result = await this.query<{ todoList: { todos: RawTodo[] } }>(query, {
      todoListId: listId,
    });

    if (result.success && result.data?.todoList?.todos) {
      return { success: true, data: result.data.todoList.todos.map((t) => this.mapRawTodo(t)) };
    }

    return { success: false, error: 'Failed to get todos', data: [] };
  }

  /**
   * Create a todo with title and description
   * IMPORTANT: CreateTodoInput uses 'description' field, not 'text'!
   * The output Todo has 'text' field which contains the description.
   */
  async createTodo(
    listId: string,
    title: string,
    text?: string,
    parentId?: string
  ): Promise<ApiResponse<Todo>> {
    // Note: parentId is not supported in CreateTodoInput based on introspection
    // We'll ignore it for now - hierarchical todos might need a different approach
    if (parentId) {
      console.warn('[Blue.cc] parentId not supported in createTodo - ignoring');
    }

    const mutation = `
      mutation CreateTodo($input: CreateTodoInput!) {
        createTodo(input: $input) {
          id
          title
          text
          done
          position
          createdAt
          updatedAt
        }
      }
    `;

    const input: Record<string, unknown> = {
      todoListId: listId,
      title,
    };

    // CreateTodoInput uses 'description' field, not 'text'
    if (text) {
      input.description = text;
    }

    const result = await this.query<{ createTodo: RawTodo }>(mutation, { input });

    if (result.success && result.data?.createTodo) {
      return { success: true, data: this.mapRawTodo(result.data.createTodo) };
    }

    return { success: false, error: result.error || 'Failed to create todo' };
  }

  /**
   * Get connection status
   * Uses recentProjects query as "me" query doesn't exist in Blue.cc schema
   */
  async checkConnection(): Promise<ApiResponse<{ connected: boolean; userId?: string }>> {
    if (!this.isInitialized()) {
      return { success: false, data: { connected: false } };
    }

    const query = `
      query CheckConnection {
        recentProjects {
          id
          company {
            id
            name
          }
        }
      }
    `;

    const result = await this.query<{
      recentProjects: Array<{ id: string; company: { id: string; name: string } }>;
    }>(query);

    if (result.success && result.data?.recentProjects?.[0]) {
      return {
        success: true,
        data: {
          connected: true,
          userId: result.data.recentProjects[0].company.id,
        },
      };
    }

    return { success: false, data: { connected: false } };
  }

  /**
   * Get project ID (workspace ID equivalent)
   */
  getWorkspaceId(): string | null {
    return this.projectId;
  }

  /**
   * Get company ID
   */
  getCompanyId(): string | null {
    return this.companyId;
  }

  /**
   * Reset client (for logout)
   */
  reset(): void {
    this.client = null;
    this.config = null;
    this.companyId = null;
    this.projectId = null;
    this.journeyListId = null;
    this.booksListId = null;
    this.cohortListId = null;
    console.log('[Blue.cc] Client reset');
  }
}

// Singleton instance
export const blueCore = new BlueCoreService();

export default blueCore;
