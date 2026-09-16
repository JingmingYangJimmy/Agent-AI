import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OpenAIEmbeddings } from "@langchain/openai";//text -> vector
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";//co sign similarity, assemble
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";//we can do youtube video later, not only pdf
import { VectorStore } from "@langchain/core/vectorstores";

// One shared store for all uploaded files. Each file is embedded once, at upload time.
let vectorStore = null;

// Created on first use, because dotenv.config() in server.js runs after this file is imported
const getVectorStore = () => {
    if (!vectorStore) {
        const embeddings = new OpenAIEmbeddings({apiKey: process.env.OPENAI_API_KEY});
        vectorStore = new MemoryVectorStore(embeddings);
    }
    return vectorStore;
};

// Remove all chunks of one file. PDFLoader saves the file path in metadata.source
export const removeFile = (filePath) => {
    const store = getVectorStore();
    store.memoryVectors = store.memoryVectors.filter(
        (vector) => vector.metadata.source !== filePath
    );
};

// Load, split and embed one file, then add it to the store
export const addFile = async (filePath) => {
    removeFile(filePath); // delete if it existed or old
    const loader = new PDFLoader(filePath);
    const data = await loader.load();
    const textsplitters = new RecursiveCharacterTextSplitter({//sever in every 500
        chunkSize: 500,
        chunkOverlap: 75,//we need 10% - 20% overlap, it is 15%
    });

    const splitDocs = await textsplitters.splitDocuments(data);
    await getVectorStore().addDocuments(splitDocs); // embedding API is called here, only once per file
};

const chat = async (query) => {
    const apiKey = process.env.OPENAI_API_KEY;

    const model = new ChatOpenAI({
        model: "gpt-5",
        apiKey,
    });

    const template = `Use the following pieces of context to answer the question at the end.
        If you don't know the answer, just say that you don't know, don't try to make up an answer.
        Use three sentences maximum and keep the answer as concise as possible.

    {context} //use cosine similarity to find relevant chunks
    Question: {question}
    Helpful Answer:`;

    const prompt = PromptTemplate.fromTemplate(template);

    const retriever = getVectorStore().asRetriever();
    const relevantDocs = await retriever.invoke(query);

    // Format context from retrieved documents
    //we can also sort the chunk afterwords
    const context = relevantDocs.map((doc) => doc.pageContent).join("\n\n");

    // Create a simple chain using the prompt template
    const formattedPrompt = await prompt.format({
    context,
    question: query,
  });

  // Get response from the model
  const response = await model.invoke(formattedPrompt);

  return { text: response.content };
};

export default chat;
//role access, different person access their own data, id
