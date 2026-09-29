/**
 * M1 fixture contract, maintained alongside the migration while Docker is unavailable.
 * Regenerate against the local database before adding operational schema.
 */
export type Database = {
  public: {
    Tables: {
      foundation_samples: {
        Row: {
          id: string;
          label: string;
          is_public: boolean;
        };
        Insert: {
          id: string;
          label: string;
          is_public?: boolean;
        };
        Update: {
          id?: string;
          label?: string;
          is_public?: boolean;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
