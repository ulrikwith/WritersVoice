// Blue.cc Books Service
// CRUD operations for books stored as Blue.cc todos
// Uses description-based metadata storage (PMT pattern) for reliable sync

import blueCore from './core';
import { encodeMetadata, decodeMetadata } from './metadata';
import type {
  ApiResponse,
  Book,
  BookMetadata,
  CreateBookInput,
  UpdateBookInput,
  Todo,
} from './types';

class BooksService {
  /**
   * Get all books for the current user
   */
  async getBooks(): Promise<ApiResponse<Book[]>> {
    const listId = await blueCore.getBooksListId();

    const result = await blueCore.getTodos(listId);

    if (!result.success || !result.data) {
      return { success: false, error: result.error || 'Failed to fetch books' };
    }

    // Filter to only top-level todos (books, not chapters)
    const books = result.data
      .filter((todo) => !todo.parentId)
      .map((todo) => this.todoToBook(todo));

    return { success: true, data: books };
  }

  /**
   * Get a single book by ID
   */
  async getBook(bookId: string): Promise<ApiResponse<Book>> {
    const todoResult = await blueCore.getTodo(bookId);

    if (!todoResult.success || !todoResult.data) {
      return { success: false, error: 'Book not found' };
    }

    const book = this.todoToBook(todoResult.data);
    return { success: true, data: book };
  }

  /**
   * Create a new book
   */
  async createBook(input: CreateBookInput): Promise<ApiResponse<Book>> {
    const listId = await blueCore.getBooksListId();

    // Build metadata
    const metadata: BookMetadata = {
      ...input.metadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Encode book data as metadata in description
    const todoText = encodeMetadata(input.description || '', {
      metadata,
    });

    const result = await blueCore.createTodo(listId, input.title, todoText);

    if (!result.success || !result.data) {
      return { success: false, error: result.error || 'Failed to create book' };
    }

    console.log(`[Blue.cc] Created book: ${input.title}`);

    const book: Book = {
      id: result.data.id,
      title: input.title,
      description: input.description,
      metadata,
      position: result.data.position,
    };

    return { success: true, data: book };
  }

  /**
   * Update a book
   */
  async updateBook(input: UpdateBookInput): Promise<ApiResponse<Book>> {
    // Fetch existing book first
    const existingResult = await this.getBook(input.id);
    if (!existingResult.success || !existingResult.data) {
      return { success: false, error: 'Book not found' };
    }

    const existing = existingResult.data;

    // Merge metadata
    const updatedMetadata: BookMetadata = {
      ...existing.metadata,
      ...input.metadata,
      updatedAt: new Date().toISOString(),
    };

    // Encode updated data
    const todoText = encodeMetadata(input.description || existing.description || '', {
      metadata: updatedMetadata,
    });

    // Update todo
    const updateData: { title?: string; text?: string } = { text: todoText };
    if (input.title !== undefined) {
      updateData.title = input.title;
    }

    const result = await blueCore.updateTodo(input.id, updateData);

    if (!result.success) {
      return { success: false, error: result.error || 'Failed to update book' };
    }

    const book: Book = {
      id: input.id,
      title: input.title || existing.title,
      description: input.description || existing.description,
      metadata: updatedMetadata,
      position: existing.position,
      chapters: existing.chapters,
    };

    return { success: true, data: book };
  }

  /**
   * Delete a book
   */
  async deleteBook(bookId: string): Promise<ApiResponse<void>> {
    const result = await blueCore.deleteTodo(bookId);

    if (result.success) {
      console.log(`[Blue.cc] Deleted book: ${bookId}`);
    }

    return result;
  }

  /**
   * Reorder books
   */
  async reorderBooks(bookIds: string[]): Promise<ApiResponse<void>> {
    const mutation = `
      mutation ReorderBook($input: UpdateTodoInput!) {
        updateTodo(input: $input) {
          id
          position
        }
      }
    `;

    const errors: string[] = [];

    for (let i = 0; i < bookIds.length; i++) {
      const result = await blueCore.query(mutation, {
        input: {
          todoId: bookIds[i],
          position: i,
        },
      });

      if (!result.success) {
        errors.push(`Failed to reorder book ${bookIds[i]}: ${result.error || 'Unknown error'}`);
      }
    }

    if (errors.length > 0) {
      console.error('[Blue.cc] Reorder errors:', errors);
      return { success: false, error: errors.join('; ') };
    }

    return { success: true };
  }

  /**
   * Search books by title
   */
  async searchBooks(searchTerm: string): Promise<ApiResponse<Book[]>> {
    const listId = await blueCore.getBooksListId();
    const result = await blueCore.searchTodos(listId, searchTerm);

    if (!result.success || !result.data) {
      return { success: false, error: result.error, data: [] };
    }

    // Filter to only top-level todos (books, not chapters)
    const books = result.data
      .filter((todo) => !todo.parentId)
      .map((todo) => this.todoToBook(todo));

    return { success: true, data: books };
  }

  /**
   * Get book count
   */
  async getBookCount(): Promise<ApiResponse<number>> {
    const result = await this.getBooks();

    if (!result.success) {
      return { success: false, error: result.error, data: 0 };
    }

    return { success: true, data: result.data?.length || 0 };
  }

  /**
   * Convert a Blue.cc Todo to a Book
   */
  private todoToBook(todo: Todo): Book {
    // Decode metadata from todo text
    const { description, metadata } = decodeMetadata(todo.text);

    // Extract book metadata from decoded data
    const bookMetadata: BookMetadata = (metadata.metadata as BookMetadata) || {
      createdAt: todo.createdAt,
      updatedAt: todo.updatedAt,
    };

    // Ensure timestamps exist
    if (!bookMetadata.createdAt) {
      bookMetadata.createdAt = todo.createdAt;
    }
    if (!bookMetadata.updatedAt) {
      bookMetadata.updatedAt = todo.updatedAt;
    }

    return {
      id: todo.id,
      title: todo.title,
      description: description || undefined,
      metadata: bookMetadata,
      position: todo.position,
      chapters: todo.children?.map((child) => {
        // Decode chapter metadata
        const { description: chapterDesc, metadata: chapterMeta } = decodeMetadata(child.text);

        return {
          id: child.id,
          bookId: todo.id,
          title: child.title,
          synopsis: chapterDesc || undefined,
          position: child.position,
          metadata: (chapterMeta.metadata as { lastEditedAt?: string }) || {
            lastEditedAt: todo.updatedAt,
          },
        };
      }),
    };
  }

  /**
   * Sync a local book to Blue.cc
   */
  async syncBook(localBook: {
    id?: string;
    title: string;
    description?: string;
    metadata?: Partial<BookMetadata>;
  }): Promise<ApiResponse<Book>> {
    if (localBook.id) {
      // Try to update existing
      const existingResult = await this.getBook(localBook.id);
      if (existingResult.success) {
        return this.updateBook({
          id: localBook.id,
          title: localBook.title,
          description: localBook.description,
          metadata: localBook.metadata,
        });
      }
    }

    // Create new book
    return this.createBook({
      title: localBook.title,
      description: localBook.description,
      metadata: localBook.metadata,
    });
  }
}

// Singleton instance
export const booksService = new BooksService();

export default booksService;
