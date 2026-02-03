// Blue.cc Core Service
// GraphQL client and authentication management

import { GraphQLClient } from 'graphql-request';
import type { BlueConfig, ApiResponse, TodoList, Todo } from './types';

// Default API endpoint
const DEFAULT_ENDPOINT = 'https://api.blue.cc/graphql';

class BlueCoreService {
  private client: GraphQLClient | null = null;
  private config: BlueConfig | null = null;
  private workspaceId: string | null = null;
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
   * Execute a GraphQL query/mutation
   */
  async query<T>(
    query: string,
    variables?: Record<string, unknown>
  ): Promise<ApiResponse<T>> {
    try {
      const client = this.getClient();
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
   */
  async ensureWorkspace(): Promise<ApiResponse<{ workspaceId: string }>> {
    // Get current user's workspace
    const workspaceQuery = `
      query GetWorkspace {
        me {
          id
          workspaces {
            id
            name
          }
        }
      }
    `;

    const result = await this.query<{
      me: { id: string; workspaces: Array<{ id: string; name: string }> };
    }>(workspaceQuery);

    if (!result.success || !result.data?.me?.workspaces?.[0]) {
      return { success: false, error: 'Could not retrieve workspace' };
    }

    this.workspaceId = result.data.me.workspaces[0].id;

    // Ensure required lists exist
    await this.ensureRequiredLists();

    return { success: true, data: { workspaceId: this.workspaceId } };
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
   * - Names follow pattern: BookArchitect_{Domain}
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
    // Get existing lists
    const listsQuery = `
      query GetLists {
        todoLists {
          id
          title
        }
      }
    `;

    const result = await this.query<{ todoLists: TodoList[] }>(listsQuery);

    if (!result.success || !result.data?.todoLists) {
      throw new Error('Could not retrieve todo lists');
    }

    const lists = result.data.todoLists;

    // Find or create Journey list if not configured
    if (!this.journeyListId) {
        const journeyList = lists.find((l) => l.title === 'BookArchitect_VoiceJourneys');
        if (journeyList) {
          this.journeyListId = journeyList.id;
        } else {
          this.journeyListId = await this.createList('BookArchitect_VoiceJourneys');
        }
    }

    // Find or create Books list if not configured
    if (!this.booksListId) {
        const booksList = lists.find((l) => l.title === 'BookArchitect_Books');
        if (booksList) {
          this.booksListId = booksList.id;
        } else {
          this.booksListId = await this.createList('BookArchitect_Books');
        }
    }

    // Find or create Community list if not configured
    if (!this.cohortListId) {
        const cohortList = lists.find((l) => l.title === 'BookArchitect_Community');
        if (cohortList) {
          this.cohortListId = cohortList.id;
        } else {
          this.cohortListId = await this.createList('BookArchitect_Community');
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
      input: { title },
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
   */
  async getTodo(todoId: string): Promise<ApiResponse<Todo>> {
    const query = `
      query GetTodo($id: ID!) {
        todo(id: $id) {
          id
          todoListId
          title
          text
          completed
          completedAt
          position
          parentId
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
          tags {
            id
            name
            color
          }
          children {
            id
            title
            position
          }
        }
      }
    `;

    const result = await this.query<{ todo: Todo }>(query, { id: todoId });

    if (result.success && result.data?.todo) {
      return { success: true, data: result.data.todo };
    }

    return { success: false, error: 'Todo not found' };
  }

  /**
   * Delete a todo
   */
  async deleteTodo(todoId: string): Promise<ApiResponse<void>> {
    const mutation = `
      mutation DeleteTodo($id: ID!) {
        deleteTodo(id: $id) {
          id
        }
      }
    `;

    const result = await this.query<{ deleteTodo: { id: string } }>(mutation, {
      id: todoId,
    });

    return { success: result.success };
  }

  /**
   * Search todos in a list
   */
  async searchTodos(
    listId: string,
    searchTerm: string,
    limit = 50
  ): Promise<ApiResponse<Todo[]>> {
    const query = `
      query SearchTodos($listId: ID!, $search: String, $limit: Int) {
        todos(todoListId: $listId, filter: { search: $search }, limit: $limit) {
          id
          title
          text
          completed
          position
          parentId
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
    `;

    const result = await this.query<{ todos: Todo[] }>(query, {
      listId,
      search: searchTerm,
      limit,
    });

    if (result.success && result.data?.todos) {
      return { success: true, data: result.data.todos };
    }

    return { success: false, error: 'Search failed', data: [] };
  }

  /**
   * Get connection status
   */
  async checkConnection(): Promise<ApiResponse<{ connected: boolean; userId?: string }>> {
    if (!this.isInitialized()) {
      return { success: false, data: { connected: false } };
    }

    const query = `
      query CheckConnection {
        me {
          id
          email
        }
      }
    `;

    const result = await this.query<{ me: { id: string; email: string } }>(query);

    if (result.success && result.data?.me?.id) {
      return {
        success: true,
        data: { connected: true, userId: result.data.me.id },
      };
    }

    return { success: false, data: { connected: false } };
  }

  /**
   * Get workspace ID
   */
  getWorkspaceId(): string | null {
    return this.workspaceId;
  }

  /**
   * Reset client (for logout)
   */
  reset(): void {
    this.client = null;
    this.config = null;
    this.workspaceId = null;
    this.journeyListId = null;
    this.booksListId = null;
    this.cohortListId = null;
    console.log('[Blue.cc] Client reset');
  }
}

// Singleton instance
export const blueCore = new BlueCoreService();

export default blueCore;
