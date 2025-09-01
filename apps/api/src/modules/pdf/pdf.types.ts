export interface DocumentOptions {
  fileName: string;
  pageSize?: "A4" | "Letter" | "Legal";
  orientation?: "portrait" | "landscape";
  margin?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string;
  };
}

export interface ContentItem {
  type: "text" | "table" | "image" | "line" | "space";
  content?: string | Buffer;
  style?: {
    fontSize?: number;
    font?: string;
    color?: string;
    alignment?: "left" | "center" | "right" | "justify";
    bold?: boolean;
    italics?: boolean;
  };
  position?: {
    x?: number;
    y?: number;
  };
  dimensions?: {
    width?: number;
    height?: number;
  };
}

export interface DocumentData {
  options: DocumentOptions;
  content: ContentItem[];
  header?: ContentItem[];
  footer?: ContentItem[];
}
