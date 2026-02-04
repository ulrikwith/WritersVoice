// Blue.cc Chapters Service
// CRUD operations for chapters stored as child todos under books
// Uses description-based metadata storage (PMT pattern) for reliable sync

import blueCore from './core';
import { encodeMetadata, decodeMetadata } from './metadata';
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
    const todoResult = await blueCore.getTodo(bookId);

    if (!todoResult.success || !todoResult.data?.children) {
      return { success: false, error: todoResult.error || 'Failed to fetch chapters' };
    }

    const chapters = todoResult.data.children
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

    // Build chapter metadata
    const metadata: ChapterMetadata = {
      ...input.metadata,
      wordCount: input.content ? input.content.trim().split(/\s+/).filter(Boolean).length : 0,
      lastEditedAt: new Date().toISOString(),
    };

    // Encode chapter data as metadata in description
    // Store synopsis as description, metadata encoded after marker
    const todoText = encodeMetadata(input.synopsis || '', {
      metadata,
      contentPreview: input.content?.substring(0, 1000),
    });

    const result = await blueCore.createTodo(
      listId,
      input.title,
      todoText,
      input.bookId // parentId
    );

    if (!result.success || !result.data) {
      return { success: false, error: result.error || 'Failed to create chapter' };
    }

    console.log(`[Blue.cc] Created chapter: ${input.title}`);

    const chapter: Chapter = {
      id: result.data.id,
      bookId: input.bookId,
      title: input.title,
      synopsis: input.synopsis,
      contentPreview: input.content?.substring(0, 1000),
      metadata,
      position: result.data.position,
    };

    return { success: true, data: chapter };
  }

  /**
   * Update a chapter
   */
  async updateChapter(input: UpdateChapterInput): Promise<ApiResponse<Chapter>> {
    // Fetch existing chapter first
    const existingResult = await this.getChapter(input.id);
    if (!existingResult.success || !existingResult.data) {
      return { success: false, error: 'Chapter not found' };
    }

    const existing = existingResult.data;

    // Merge metadata
    const updatedMetadata: ChapterMetadata = {
      ...existing.metadata,
      ...input.metadata,
      lastEditedAt: new Date().toISOString(),
    };

    // Update word count if content changed
    if (input.content) {
      updatedMetadata.wordCount = input.content.trim().split(/\s+/).filter(Boolean).length;
    }

    // Encode updated data
    const todoText = encodeMetadata(input.synopsis || existing.synopsis || '', {
      metadata: updatedMetadata,
      contentPreview: input.content?.substring(0, 1000) || existing.contentPreview,
    });

    // Build update object
    const updateData: { title?: string; text?: string } = { text: todoText };
    if (input.title !== undefined) {
      updateData.title = input.title;
    }

    const result = await blueCore.updateTodo(input.id, updateData);

    if (!result.success) {
      return { success: false, error: result.error || 'Failed to update chapter' };
    }

    const chapter: Chapter = {
      id: input.id,
      bookId: existing.bookId,
      title: input.title || existing.title,
      synopsis: input.synopsis || existing.synopsis,
      contentPreview: input.content?.substring(0, 1000) || existing.contentPreview,
      metadata: updatedMetadata,
      position: input.position ?? existing.position,
    };

    return { success: true, data: chapter };
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
          todoId: chapterIds[i],
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
      todoId: chapterId,
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
    // Update chapter metadata with Google Drive file ID
    const chapterResult = await this.getChapter(chapterId);
    if (!chapterResult.success || !chapterResult.data) {
      return { success: false, error: 'Chapter not found' };
    }

    const updateResult = await this.updateChapter({
      id: chapterId,
      metadata: {
        ...chapterResult.data.metadata,
        googleDriveFileId: fileId,
      },
    });

    return { success: updateResult.success, error: updateResult.error };
  }

  /**
   * Get Google Drive file ID for a chapter
   */
  async getGoogleDriveFileId(chapterId: string): Promise<ApiResponse<string | null>> {
    const chapterResult = await this.getChapter(chapterId);
    if (!chapterResult.success || !chapterResult.data) {
      return { success: false, error: 'Chapter not found' };
    }

    return {
      success: true,
      data: chapterResult.data.metadata.googleDriveFileId || null,
    };
  }

  /**
   * Convert a Blue.cc Todo to a Chapter
   */
  private todoToChapter(todo: Todo, bookId: string): Chapter {
    // Decode metadata from todo text
    const { description, metadata } = decodeMetadata(todo.text);

    // Extract chapter metadata from decoded data
    const chapterMetadata: ChapterMetadata = (metadata.metadata as ChapterMetadata) || {
      lastEditedAt: todo.updatedAt,
    };

    // Ensure lastEditedAt exists
    if (!chapterMetadata.lastEditedAt) {
      chapterMetadata.lastEditedAt = todo.updatedAt;
    }

    return {
      id: todo.id,
      bookId,
      title: todo.title,
      synopsis: description || undefined,
      contentPreview: (metadata.contentPreview as string) || undefined,
      metadata: chapterMetadata,
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
