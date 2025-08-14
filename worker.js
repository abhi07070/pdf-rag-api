const { Worker } = require('bullmq');
const { OpenAIEmbeddings } = require("@langchain/openai");
const { QdrantVectorStore } = require("@langchain/qdrant");
const { PDFLoader } = require("@langchain/community/document_loaders/fs/pdf");
const dotenv = require('dotenv');
dotenv.config()

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

            console.log("docs: ", docs)

            const embeddings = new OpenAIEmbeddings({
                model: 'text-embedding-3-small',
                apiKey: process.env.OPEN_AI,
            });

            const vectorStore = await QdrantVectorStore.fromExistingCollection(
                embeddings,
                {
                    url: 'http://localhost:6333',
                    collectionName: 'langchainjs-testing',
                }
            );
            try {
                await vectorStore.addDocuments(docs);
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
        concurrency: 100,
        connection: {
            host: 'localhost',
            port: '6379'
        }
    }
);