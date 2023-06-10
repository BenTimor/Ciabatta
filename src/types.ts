export type Context = {
    name: string;
    messages: { role: string, content: string }[];
}