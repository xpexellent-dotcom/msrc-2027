/**
 * No hosted tables or RPCs have an approved application contract yet.
 * Replace this with generated, reviewed types when a hosted schema is integrated.
 * The local foundation_samples fixture must not imply that it exists remotely.
 */
export type UnconfiguredDatabase = {
  public: {
    Tables: { [_ in never]: never };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
