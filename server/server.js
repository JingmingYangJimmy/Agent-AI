import express from "express";//framework of API
import cors from "cors";//communicate between frontend and backend
import dotenv from "dotenv";
import multer from "multer"; //user upload file, better not do this way, we can store it in aws s3, or GGS
import fs from "fs/promises";
import path from "path";
import chat from "./chat.js";
import chatMCP from "./chat-mcp.js";

dotenv.config();

const app = express();
app.use(cors());

// Configure multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
    //we can add timestap and geo location, also we can shorten long name
    //if people upload same file name, we can use it to differentiate
  },
});

const upload = multer({ storage: storage });

const PORT = 5001;//javascript default port

const filePaths = new Set(); // all uploaded files, Set avoids duplicates when the same file is uploaded again

//we are using stateless (RESTFUL API), since we can scale up (horizontal scaling)
//for real time, do not use REST API, use web socket (multiple chat room)

//how can we support more users, design a data structure, have an object
//key: user name  value: file name

app.post("/upload", upload.single("file"), (req, res) => {
  // Use multer to handle file upload
  filePaths.add(req.file.path); // The path where the file is temporarily saved
  res.send(req.file.path + " upload successfully.");
});

app.delete("/upload/:filename", async (req, res) => {
  // basename stops names like "../server.js" from deleting files outside uploads/
  const filePath = path.join("uploads", path.basename(req.params.filename));
  filePaths.delete(filePath);
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      // ENOENT = file already gone, which is fine
      return res.status(500).send("Delete failed.");
    }
  }
  res.send(filePath + " deleted successfully.");
});

app.get("/chat", async (req, res) => {
  if (filePaths.size === 0) {
    return res.status(400).send({
      ragAnswer: "Please upload a PDF first.",
      mcpAnswer: "",
    });
  }

  const ragResp = await chat([...filePaths], req.query.question);
  const mcpResp = await chatMCP(req.query.question);

  res.send({
    ragAnswer: ragResp.text,
    mcpAnswer: mcpResp.text,
  });
});

//this is writting backend using express, use much fewer lines of code

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});



