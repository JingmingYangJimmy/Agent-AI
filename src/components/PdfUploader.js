import React from "react";
import axios from "axios"; // Import axios for HTTP requests
import { InboxOutlined } from "@ant-design/icons";
import { message, Modal, Upload } from "antd";

const { Dragger } = Upload;

const DOMAIN = "http://localhost:5001";

const uploadToBackend = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  try {
    const response = await axios.post(`${DOMAIN}/upload`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response;
  } catch (error) {
    console.error("Error uploading file: ", error);
    return null;
  }
};

const attributes = {
  name: "file",//a user upload multiple file, how to deal?
  multiple: true,
  customRequest: async ({ file, onSuccess, onError }) => {
    const response = await uploadToBackend(file);
    if (response && response.status === 200) {
      // Handle success
      onSuccess(response.data);
    } else {
      // Handle error
      onError(new Error("Upload failed"));
    }
  },
  onChange(info) {
    const { status } = info.file;
    if (status !== "uploading") {
      console.log(info.file, info.fileList);
    }
    if (status === "done") {
      message.success(`${info.file.name} file uploaded successfully.`);
    } else if (status === "error") {
      message.error(`${info.file.name} file upload failed.`);
    }
  },
  // Ask once, then delete on the server. Resolving false keeps the file in the list.
  onRemove(file) {
    return new Promise((resolve) => {
      Modal.confirm({
        title: `Delete ${file.name}?`,
        content: "This will remove the file from the server.",
        okText: "Delete",
        okType: "danger",
        onOk: async () => {
          try {
            await axios.delete(
              `${DOMAIN}/upload/${encodeURIComponent(file.name)}`
            );
            message.success(`${file.name} deleted.`);
            resolve(true);
          } catch (error) {
            console.error("Error deleting file: ", error);
            message.error(`${file.name} delete failed.`);
            resolve(false);
          }
        },
        onCancel: () => resolve(false),
      });
    });
  },
  onDrop(e) {
    console.log("Dropped files", e.dataTransfer.files);
  },
};

const PdfUploader = () => {//UI
  return (
    <Dragger {...attributes}>
      <p className="ant-upload-drag-icon">
        <InboxOutlined />
      </p>
      <p className="ant-upload-text">
        Click or drag file to this area to upload
      </p>
      <p className="ant-upload-hint">
        Support for a single or bulk upload. Strictly prohibited from uploading
        company data or other banned files.
      </p>
    </Dragger>
  );
};

export default PdfUploader;