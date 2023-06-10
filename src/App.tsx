import { useCallback, useState, useEffect } from 'react'
import { Container } from './Container';
import { Context } from './types';

const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
const endpoint = 'https://api.openai.com/v1/chat/completions';
const system = {
    "comment": "You're writing a comment for something on the internet. The input you get from the user is the text you're commenting on and the website you're in. It'll look like: \nWebsite: NAME\nContent: TEXT. Whatever you write goes directly to the comment input, so put there only the text you want to comment. Choose your tone according to the website and the text. Make the comment short and professional. Add something to the discussion in the post and don't only repeat about what the post said.",
    "rephrase": "You need to rephrase a sentence. The input you get from the user is the sentence you need to rephrase. Whatever you write goes directly to the input, so put there only the rephrased text. If the text is good enough, just send back the original text. Use the same tone as the text's one.",
}

const defaultContextMessages = [
    {
        role: "system",
        content: "You're a chrome extension. You might get multiple messages from the user as a context, so you can use them to generate a better response. Before each message that you need to respond to, you'll get a message with the role 'system' and content that explains what's the expected behavior for you. Always use the last system message to guide your response and use the ones that comes before only as a context."
    }
];

function gptRequest(selectedText: string, type: keyof typeof system, context?: Context) {
    const messages = [
        ...context?.messages || defaultContextMessages,
        {
            role: "system",
            content: system[type],
        },
        {
            role: "user",
            content: selectedText
        }
    ];

    const requestOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: import.meta.env.VITE_OPENAI_MODEL,
            messages,
        }),
    };

    return fetch(endpoint, requestOptions)
        .then((response) => response.json())
        .then((data) => {
            const resp = data.choices[0].message.content;

            return [resp, [
                ...messages,
                {
                    role: "assistant",
                    content: resp,
                }
            ]];
        })
        .catch((error) => console.error('Error:', error));
}

function getSelectedTextAndTitle(): Promise<{ text: string, title: string }> {
    return new Promise(resolve => {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, { action: "getSelectedText" }, (resp) => {
                console.log(resp);

                resolve(resp);
            });
        });
    });
}


function App() {
    const [text, setText] = useState();
    const [copyText, setCopyText] = useState("Copy");
    const [loading, setLoading] = useState(false);
    const [contextOptions, setContextOptions] = useState<Context[]>(JSON.parse(localStorage.getItem("contextOptions") || "[]"));
    const [context, setContext] = useState<Context>();
    const [createContext, setCreateContext] = useState(false);
    const [contextName, setContextName] = useState("");

    useEffect(() => {
        localStorage.setItem("contextOptions", JSON.stringify(contextOptions));
    }, [contextOptions]);

    useEffect(() => {
        if (context) {
            setContextOptions(contextOptions.map(c => c.name === context.name ? context : c));
        }
    }, [context]);

    const getGPTResponse = useCallback(async (type) => {
        setLoading(true);
        let { text, title } = await getSelectedTextAndTitle();

        if (type === "comment") {
            text = `Website: ${title}\nContent: ${text}`;
        }

        console.log("Sending to GPT:", text);

        const data = await gptRequest(text, type, context);

        if (!data) {
            // TODO
            setLoading(false);
            return;
        }

        const [resp, newContextMessages] = data;

        setLoading(false);
        setText(resp);
        if (context) {
            setContext({ ...context, messages: newContextMessages });
        }

        return resp;
    }, [setLoading, setText, context, setContext, getSelectedTextAndTitle]);

    const addToContext = useCallback(async () => {
        setContext({ ...context, messages: [...(context.messages || defaultContextMessages), { role: "user", content: (await getSelectedTextAndTitle()).text }] });
    }, [context, setContext, getSelectedTextAndTitle]);

    const copy = useCallback(() => {
        navigator.clipboard.writeText(text);
        setCopyText("Copied!");
        setTimeout(() => setCopyText("Copy"), 1000);
    }, [text]);


    if (loading) return <>
        <Container>
            <p> Loading... </p>
        </Container>
    </>

    if (createContext) return <>
        <Container>
            <div>
                <input type="text" placeholder="Context name" onChange={e => setContextName(e.target.value)} value={contextName} />
                <button onClick={() => setCreateContext(false)}> Cancel </button>
                <button onClick={() => {
                    setContextOptions([...contextOptions, { name: contextName, messages: [] }]);
                    setContext({ name: contextName, messages: [] });
                    setContextName("");
                    setCreateContext(false);
                }}> Create </button>
            </div>
        </Container>
    </>

    if (!text) return <>
        <Container>
            <div>
                <button onClick={() => getGPTResponse("comment")}> Comment </button>
                <button onClick={() => getGPTResponse("rephrase")}> Rephrase </button>
                <button onClick={() => addToContext()}> Add to context </button>
                <button onClick={() => localStorage.clear()}> Clear context </button>
            </div>
            <div>
                <select name="context" id="context" onChange={(e) => {
                    const context = contextOptions.find(c => c.name === e.target.value);
                    if (context) {
                        setContext(context);
                    } else if (e.target.value === "create") {
                        setCreateContext(true);
                    }
                }}>
                    <option value=""> Select context </option>
                    {contextOptions.map(c => <option key={c.name} value={c.name}> {c.name} </option>)}
                    <option value="create"> Create new context </option>
                </select>
            </div>
        </Container>
    </>

    return <>
        <Container>
            <p> {text} </p>
            <button onClick={() => copy()}> {copyText} </button>
        </Container>
    </>
}

export default App
