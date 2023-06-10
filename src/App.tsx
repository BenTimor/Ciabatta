import { useCallback, useState } from 'react'

const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
const endpoint = 'https://api.openai.com/v1/chat/completions';
const system = {
    "comment": "You're writing a comment for something on the internet. The input you get from the user is the text you're commenting on and the website you're in. It'll look like: \nWebsite: NAME\nContent: TEXT. Whatever you write goes directly to the comment input, so put there only the text you want to comment. Choose your tone according to the website and the text. Make the comment short and professional. Add something to the discussion in the post and don't only repeat about what the post said.",
    "rephrase": "You need to rephrase a sentence. The input you get from the user is the sentence you need to rephrase. Whatever you write goes directly to the input, so put there only the rephrased text. If the text is good enough, just send back the original text. Use the same tone as the text's one.",
}

function gptRequest(selectedText, type) {
    const requestOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: import.meta.env.VITE_OPENAI_MODEL,
            messages: [
                {
                    role: "system",
                    content: system[type],
                },
                {
                    role: "user",
                    content: selectedText
                }
            ],
        }),
    };

    return fetch(endpoint, requestOptions)
        .then((response) => response.json())
        .then((data) => {
            console.log(data);
            return data.choices[0].message.content;
        })
        .catch((error) => console.error('Error:', error));
}

function App() {
    const [text, setText] = useState();
    const [copyText, setCopyText] = useState("Copy");
    const [loading, setLoading] = useState(false);

    const getGPTResponse = useCallback((type) => {
        return new Promise(resolve => {
            setLoading(true);
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                chrome.tabs.sendMessage(tabs[0].id, { action: "getSelectedText" }, async ({text: _text, title}) => {
                    let text = _text;

                    if (type === "comment") {
                        text = `Website: ${title}\nContent: ${text}`;
                    }

                    console.log("Sending to GPT:", text);

                    const resp = await gptRequest(text, type);
                    setLoading(false);
                    setText(resp);
                    resolve(resp);
                });
            });
        })
    }, [setLoading, setText]);

    const copy = useCallback(() => {
        navigator.clipboard.writeText(text);
        setCopyText("Copied!");
        setTimeout(() => setCopyText("Copy"), 1000);
    }, [text]);


    if (loading) return <p> Loading... </p>

    if (!text) return <>
        <button onClick={() => getGPTResponse("comment")}> Comment </button>
        <button onClick={() => getGPTResponse("rephrase")}> Rephrase </button>
    </>

    return <>
        <p> {text} </p>
        <button onClick={() => copy()}> {copyText} </button >
    </>
}

export default App
