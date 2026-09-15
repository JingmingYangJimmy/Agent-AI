import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OpenAIEmbeddings } from "@langchain/openai";//text -> vector
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";//co sign similarity, assemble
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";//we can do youtube video later, not only pdf
import { VectorStore } from "@langchain/core/vectorstores";

const chat = async (filePath, query) => {
    const apiKey = process.env.OPENAI_API_KEY;
    const loader = new PDFLoader(filePath);
    const data = await loader.load();
    const textsplitters = new RecursiveCharacterTextSplitter({//sever in every 500
        chunkSize: 500,
        chunkOverlap: 0,//we need 10% - 20% overlap, or else the sentece's meaning will be unclear
    });

    const splitDocs = await textsplitters.splitDocuments(data);
    const embeddings = new OpenAIEmbeddings({apiKey: apiKey});
    const vectorStore = await MemoryVectorStore.fromDocuments(
        splitDocs,
        embeddings,
    )

    const model = new ChatOpenAI({
        model: "gpt-5",
        apiKey,
    });

    const template = `Use the following pieces of context to answer the question at the end.
        If you don't know the answer, just say that you don't know, don't try to make up an answer.
        Use three sentences maximum and keep the answer as concise as possible.

    {context}//use cosine similarity to find relevant chunks
    Question: {question}
    Helpful Answer:`;

    const prompt = PromptTemplate.fromTemplate(template);

    const retriever = vectorStore.asRetriever();
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
//everytime we invoke, we need to run it again. How to do embedding, we store it 1 time, no need to repeat
//role access, different person access their own data, id