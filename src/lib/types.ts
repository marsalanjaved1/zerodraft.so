
export interface FileNode {
    id: string;
    name: string;
    path: string;
    type: "file" | "folder";
    children?: FileNode[];
    content?: string;
}
