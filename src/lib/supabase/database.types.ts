/**
 * M1 fixture contract, checked against local Postgres generation in hosted CI.
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
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
