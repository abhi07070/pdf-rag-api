const { Worker } = require('bullmq');
const { OpenAIEmbeddings } = require("@langchain/openai");
const { QdrantVectorStore } = require("@langchain/qdrant");
const { Document } = require("@langchain/core/documents");
const { PDFLoader } = require("@langchain/community/document_loaders/fs/pdf");
const { CharacterTextSplitter } = require("@langchain/textsplitters");

const worker = new Worker(
    'file-upload',
    async (job) => {
        try {
            console.log(`Job:`, job.data);
            const data = JSON.parse(job.data);
            /*
            Path: data.path
            read the pdf from path,
            chunk the pdf,
            call the openai embedding model for every chunk,
            store the chunk in qdrant db
            */

            // Load the PDF
            const loader = new PDFLoader(data.path);
            const docs = await loader.load();


            // const textSplitter = new CharacterTextSplitter({
            //     chunkSize: 300,
            //     chunkOverlap: 0,
            // });

            // const allText = docs.map(doc => doc.pageContent).join("\n");

            // const texts = await textSplitter.splitText(docs);
            // console.log("texts: ", texts);

            const embeddings = new OpenAIEmbeddings({
                model: 'text-embedding-3-small',
                apiKey: '',
                batchSize: 5, // Smaller batches reduce pressure
                maxConcurrency: 2,
            });

            const vectorStore = await QdrantVectorStore.fromExistingCollection(
                embeddings,
                {
                    url: 'http://localhost:6333',
                    collectionName: 'langchainjs-testing',
                }
            );
            try {
                await vectorStore.addDocuments(splitDocs);
                console.log("✅ All documents added to vector store");
            } catch (error) {
                console.error("❌ Failed to add documents:", error.message);
                if (error.response?.status === 429) {
                    console.error("⏳ Rate limit hit. Try again later.");
                }
            }
            console.log(`All allText are added to vector store`);
        } catch (err) {
            console.error("❌ Worker error:", err);
        }


    },

    {
        concurrency: 1,
        connection: {
            host: 'localhost',
            port: '6379'
        }
    }
);