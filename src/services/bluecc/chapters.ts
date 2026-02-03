// Blue.cc Chapters Service
// CRUD operations for chapters stored as child todos under books

import blueCore from './core';
import customFieldsService from './customFields';
import type {
  ApiResponse,
  Chapter,
  ChapterMetadata,
  CreateChapterInput,
  UpdateChapterInput,
  Todo,
} from './types';

class ChaptersService {
  /**
   * Get all chapters for a book
   */
  async getChapters(bookId: string): Promise<ApiResponse<Chapter[]>> {
    const query = `
      query GetChapters($bookId: ID!) {
        todo(id: $bookId) {
          id
          children {
            id
            title
            text
            position
            createdAt
            updatedAt
            customFieldValues {
              field {
                id
                name
                type
              }
              value
            }
          }
        }
      }
    `;

    const result = await blueCore.query<{ todo: Todo }>(query, { bookId });

    if (!result.success || !result.data?.todo?.children) {
      return { success: false, error: result.error || 'Failed to fetch chapters' };
    }

    const chapters = result.data.todo.children
      .map((todo) => this.todoToChapter(todo, bookId))
      .sort((a, b) => a.position - b.position);

    return { success: true, data: chapters };
  }

  /**
   * Get a single chapter by ID
   */
  async getChapter(chapterId: string): Promise<ApiResponse<Chapter>> {
    const todoResult = await blueCore.getTodo(chapterId);

    if (!todoResult.success || !todoResult.data) {
      return { success: false, error: 'Chapter not found' };
    }

    const chapter = this.todoToChapter(
      todoResult.data,
      todoResult.data.parentId || ''
    );

    return { success: true, data: chapter };
  }

  /**
   * Create a new chapter
   */
  async createChapter(input: CreateChapterInput): Promise<ApiResponse<Chapter>> {
    const listId = await blueCore.getBooksListId();

    const mutation = `
      mutation CreateChapter($input: CreateTodoInput!) {
        createTodo(input: $input) {
          id
          title
          text
          position
          createdAt
          updatedAt
          parentId
        }
      }
    `;

    const result = await blueCore.query<{ createTodo: Todo }>(mutation, {
      input: {
        todoListId: listId,
        title: input.title,
        text: input.synopsis || '',
        parentId: input.bookId,
        position: input.position,
      },
    });

    if (!result.success || !result.data?.createTodo) {
      return { success: false, error: result.error || 'Failed to create chapter' };
    }

    const chapterId = result.data.createTodo.id;

    // Set chapter metadata
    // Note: split(/\s+/) on empty string returns [''], so filter to get accurate count
    const metadata: ChapterMetadata = {
      ...input.metadata,
      wordCount: input.content ? input.content.trim().split(/\s+/).filter(Boolean).length : 0,
      lastEditedAt: new Date().toISOString(),
    };

    await customFieldsService.setTodoValue(
      chapterId,
      'BookArchitect_ChapterMetadata',
      metadata
    );

    // Store content preview (first 1000 chars)
    if (input.content) {
      await customFieldsService.setTodoValue(
        chapterId,
        'BookArchitect_ContentPreview',
        input.content.substring(0, 1000)
      );
    }

    console.log(`[Blue.cc] Created chapter: ${input.title}`);

    const chapter: Chapter = {
      id: chapterId,
      bookId: input.bookId,
      title: input.title,
      synopsis: input.synopsis,
      contentPreview: input.content?.substring(0, 1000),
      metadata,
      position: result.data.createTodo.position,
    };

    return { success: true, data: chapter };
  }

  /**
   * Update a chapter
   */
  async updateChapter(input: UpdateChapterInput): Promise<ApiResponse<Chapter>> {
    const mutation = `
      mutation UpdateChapter($input: UpdateTodoInput!) {
        updateTodo(input: $input) {
          id
          title
          text
          position
          updatedAt
          parentId
        }
      }
    `;

    const updateInput: Record<string, unknown> = { id: input.id };
    if (input.title !== undefined) updateInput.title = input.title;
    if (input.synopsis !== undefined) updateInput.text = input.synopsis;
    if (input.position !== undefined) updateInput.position = input.position;

    const result = await blueCore.query<{ updateTodo: Todo }>(mutation, {
      input: updateInput,
    });

    if (!result.success) {
      return { success: false, error: result.error || 'Failed to update chapter' };
    }

    // Update metadata if provided
    if (input.metadata || input.content) {
      const existingMetadata = await customFieldsService.getTodoValue<ChapterMetadata>(
        input.id,
        'BookArchitect_ChapterMetadata'
      );

      const updatedMetadata: ChapterMetadata = {
        ...(existingMetadata.data || {}),
        ...input.metadata,
        lastEditedAt: new Date().toISOString(),
      };

      if (input.content) {
        updatedMetadata.wordCount = input.content.trim().split(/\s+/).filter(Boolean).length;
      }

      await customFieldsService.setTodoValue(
        input.id,
        'BookArchitect_ChapterMetadata',
        updatedMetadata
      );
    }

    // Update content preview if content changed
    if (input.content) {
      await customFieldsService.setTodoValue(
        input.id,
        'BookArchitect_ContentPreview',
        input.content.substring(0, 1000)
      );
    }

    return this.getChapter(input.id);
  }

  /**
   * Delete a chapter
   */
  async deleteChapter(chapterId: string): Promise<ApiResponse<void>> {
    const result = await blueCore.deleteTodo(chapterId);

    if (result.success) {
      console.log(`[Blue.cc] Deleted chapter: ${chapterId}`);
    }

    return result;
  }

  /**
   * Reorder chapters within a book
   */
  async reorderChapters(
    bookId: string,
    chapterIds: string[]
  ): Promise<ApiResponse<void>> {
    const mutation = `
      mutation ReorderChapter($input: UpdateTodoInput!) {
        updateTodo(input: $input) {
          id
          position
        }
      }
    `;

    for (let i = 0; i < chapterIds.length; i++) {
      await blueCore.query(mutation, {
        input: {
          id: chapterIds[i],
          position: i,
        },
      });
    }

    console.log(`[Blue.cc] Reordered chapters for book: ${bookId}`);
    return { success: true };
  }

  /**
   * Move a chapter to a different book
   */
  async moveChapter(
    chapterId: string,
    newBookId: string,
    position?: number
  ): Promise<ApiResponse<Chapter>> {
    const mutation = `
      mutation MoveChapter($input: UpdateTodoInput!) {
        updateTodo(input: $input) {
          id
          parentId
          position
        }
      }
    `;

    const updateInput: Record<string, unknown> = {
      id: chapterId,
      parentId: newBookId,
    };

    if (position !== undefined) {
      updateInput.position = position;
    }

    const result = await blueCore.query(mutation, { input: updateInput });

    if (!result.success) {
      return { success: false, error: 'Failed to move chapter' };
    }

    return this.getChapter(chapterId);
  }

  /**
   * Get chapter count for a book
   */
  async getChapterCount(bookId: string): Promise<ApiResponse<number>> {
    const result = await this.getChapters(bookId);

    if (!result.success) {
      return { success: false, error: result.error, data: 0 };
    }

    return { success: true, data: result.data?.length || 0 };
  }

  /**
   * Get total word count for a book
   */
  async getBookWordCount(bookId: string): Promise<ApiResponse<number>> {
    const result = await this.getChapters(bookId);

    if (!result.success || !result.data) {
      return { success: false, error: result.error, data: 0 };
    }

    const totalWords = result.data.reduce(
      (sum, chapter) => sum + (chapter.metadata.wordCount || 0),
      0
    );

    return { success: true, data: totalWords };
  }

  /**
   * Set Google Drive file ID for a chapter
   */
  async setGoogleDriveFileId(
    chapterId: string,
    fileId: string
  ): Promise<ApiResponse<void>> {
    return customFieldsService.setTodoValue(
      chapterId,
      'BookArchitect_GoogleDriveFileId',
      fileId
    );
  }

  /**
   * Get Google Drive file ID for a chapter
   */
  async getGoogleDriveFileId(chapterId: string): Promise<ApiResponse<string | null>> {
    return customFieldsService.getTodoValue<string>(
      chapterId,
      'BookArchitect_GoogleDriveFileId'
    );
  }

  /**
   * Convert a Blue.cc Todo to a Chapter
   */
  private todoToChapter(todo: Todo, bookId: string): Chapter {
    let metadata: ChapterMetadata = {
      lastEditedAt: todo.updatedAt,
    };

    let contentPreview: string | undefined;

    // Extract metadata from custom fields
    todo.customFieldValues?.forEach((cfv) => {
      if (cfv.field.name === 'BookArchitect_ChapterMetadata') {
        try {
          metadata = { ...metadata, ...JSON.parse(cfv.value) };
        } catch {
          // Keep default metadata
        }
      }
      if (cfv.field.name === 'BookArchitect_ContentPreview') {
        contentPreview = cfv.value;
      }
      if (cfv.field.name === 'BookArchitect_GoogleDriveFileId') {
        metadata.googleDriveFileId = cfv.value;
      }
    });

    return {
      id: todo.id,
      bookId,
      title: todo.title,
      synopsis: todo.text,
      contentPreview,
      metadata,
      position: todo.position,
    };
  }

  /**
   * Sync a local chapter to Blue.cc
   */
  async syncChapter(
    bookId: string,
    localChapter: {
      id?: string;
      title: string;
      synopsis?: string;
      content?: string;
      metadata?: Partial<ChapterMetadata>;
      position?: number;
    }
  ): Promise<ApiResponse<Chapter>> {
    if (localChapter.id) {
      // Try to update existing
      const existingResult = await this.getChapter(localChapter.id);
      if (existingResult.success) {
        return this.updateChapter({
          id: localChapter.id,
          title: localChapter.title,
          synopsis: localChapter.synopsis,
          content: localChapter.content,
          metadata: localChapter.metadata,
          position: localChapter.position,
        });
      }
    }

    // Create new chapter
    return this.createChapter({
      bookId,
      title: localChapter.title,
      synopsis: localChapter.synopsis,
      content: localChapter.content,
      metadata: localChapter.metadata,
      position: localChapter.position,
    });
  }
}

// Singleton instance
export const chaptersService = new ChaptersService();

export default chaptersService;
