import {
    Check,
    ChevronDown,
    Heading1,
    Heading2,
    Heading3,
    TextQuote,
    ListOrdered,
    TextIcon,
    Code,
    CheckSquare,
    type LucideIcon,
} from "lucide-react";
import { EditorBubbleItem, useEditor } from "novel";

export type SelectorItem = {
    name: string;
    icon: LucideIcon;
    command: (editor: ReturnType<typeof useEditor>["editor"]) => void;
    isActive: (editor: ReturnType<typeof useEditor>["editor"]) => boolean;
};

interface NodeSelectorProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

export const NodeSelector = ({ isOpen, setIsOpen }: NodeSelectorProps) => {
    const { editor } = useEditor();

    if (!editor) return null;

    const items: SelectorItem[] = [
        {
            name: "Text",
            icon: TextIcon,
            command: (editor) =>
                editor?.chain().focus().toggleNode("paragraph", "paragraph").run(),
            // I feel like there has to be a more efficient way to do this – feel free to PR if you know how!
            isActive: (editor) =>
                !!(editor?.isActive("paragraph") &&
                    !editor?.isActive("bulletList") &&
                    !editor?.isActive("orderedList")),
        },
        {
            name: "Heading 1",
            icon: Heading1,
            command: (editor) =>
                editor?.chain().focus().toggleHeading({ level: 1 }).run(),
            isActive: (editor) => !!editor?.isActive("heading", { level: 1 }),
        },
        {
            name: "Heading 2",
            icon: Heading2,
            command: (editor) =>
                editor?.chain().focus().toggleHeading({ level: 2 }).run(),
            isActive: (editor) => !!editor?.isActive("heading", { level: 2 }),
        },
        {
            name: "Heading 3",
            icon: Heading3,
            command: (editor) =>
                editor?.chain().focus().toggleHeading({ level: 3 }).run(),
            isActive: (editor) => !!editor?.isActive("heading", { level: 3 }),
        },
        {
            name: "To-do List",
            icon: CheckSquare,
            command: (editor) => editor?.chain().focus().toggleTaskList().run(),
            isActive: (editor) => !!editor?.isActive("taskItem"),
        },
        {
            name: "Bullet List",
            icon: ListOrdered,
            command: (editor) => editor?.chain().focus().toggleBulletList().run(),
            isActive: (editor) => !!editor?.isActive("bulletList"),
        },
        {
            name: "Numbered List",
            icon: ListOrdered,
            command: (editor) => editor?.chain().focus().toggleOrderedList().run(),
            isActive: (editor) => !!editor?.isActive("orderedList"),
        },
        {
            name: "Quote",
            icon: TextQuote,
            command: (editor) =>
                editor
                    ?.chain()
                    .focus()
                    .toggleNode("paragraph", "paragraph")
                    .toggleBlockquote()
                    .run(),
            isActive: (editor) => !!editor?.isActive("blockquote"),
        },
        {
            name: "Code",
            icon: Code,
            command: (editor) => editor?.chain().focus().toggleCodeBlock().run(),
            isActive: (editor) => !!editor?.isActive("codeBlock"),
        },
    ];

    const activeItem = items.filter((item) => item.isActive(editor)).pop() ?? {
        name: "Multiple",
    };

    return (
        <div className="relative h-full">
            <button
                className="flex h-full items-center gap-1 p-2 text-sm font-medium text-stone-600 hover:bg-stone-100 active:bg-stone-200"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span>{activeItem?.name}</span>
                <ChevronDown className="h-4 w-4" />
            </button>

            {isOpen && (
                <section className="fixed top-full z-[99999] mt-1 flex w-48 flex-col overflow-hidden rounded border border-stone-200 bg-white p-1 shadow-xl animate-in fade-in slide-in-from-top-1">
                    {items.map((item, index) => (
                        <button
                            key={index}
                            onClick={() => {
                                item.command(editor);
                                setIsOpen(false);
                            }}
                            className="flex items-center justify-between rounded-sm px-2 py-1 text-sm text-stone-600 hover:bg-stone-100"
                            type="button"
                        >
                            <div className="flex items-center gap-2">
                                <div className="rounded-sm border border-stone-200 p-1">
                                    <item.icon className="h-3 w-3" />
                                </div>
                                <span>{item.name}</span>
                            </div>
                            {activeItem.name === item.name && <Check className="h-4 w-4" />}
                        </button>
                    ))}
                </section>
            )}
        </div>
    );
};
