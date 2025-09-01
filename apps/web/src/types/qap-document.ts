export interface QapDocument {
  id: string;
  created_at: string;
  updated_at: string;
  template: {
    id: string;
    name: string;
    process_type: 'cnc' | 'sheet' | 'im';
  };
  html_content: string;
  status: 'pending' | 'completed' | 'failed';
  download_url?: string;
  approver?: {
    id: string;
    name: string;
    email: string;
  };
}
