
import type { FileNode } from "@/app/w/[workspaceId]/page";

interface DbDocument {
    id: string;
    title: string;
    type: 'file' | 'folder' | string;
    parent_id: string | null;
    content?: any;
}

export function buildFileTree(documents: DbDocument[]): FileNode[] {
    const nodeMap = new Map<string, FileNode>();
    const rootNodes: FileNode[] = [];

    // First pass: Create FileNodes (without paths yet)
    documents.forEach((doc) => {
        nodeMap.set(doc.id, {
            id: doc.id,
            name: doc.title || 'Untitled',
            path: '', // Will be computed in second pass
            type: (doc.type as "file" | "folder") || "file",
            content: typeof doc.content === 'string' ? doc.content : JSON.stringify(doc.content),
            children: [],
        });
    });

    // Second pass: Link children to parents
    documents.forEach((doc) => {
        const node = nodeMap.get(doc.id)!;
        if (doc.parent_id && nodeMap.has(doc.parent_id)) {
            const parent = nodeMap.get(doc.parent_id)!;
            parent.children = parent.children || [];
            parent.children.push(node);
        } else {
            rootNodes.push(node);
        }
    });

    // Third pass: Compute full paths recursively
    const computePaths = (nodes: FileNode[], parentPath: string = "") => {
        for (const node of nodes) {
            node.path = parentPath + "/" + node.name;
            if (node.children && node.children.length > 0) {
                computePaths(node.children, node.path);
            }
        }
    };

    computePaths(rootNodes);

    return rootNodes;
}
