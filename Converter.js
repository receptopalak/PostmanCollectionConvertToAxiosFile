const fs = require("fs");
const axios = require("axios"); // Assuming axios is used for API requests
const path = require("path");

const directoryPath = path.join(__dirname, "./PostmanCollectionFiles");
let jsonFiles;

// Dosyaları oku ve filtrele

// Function to convert Postman request to Axios service method
const convertRequestToAxiosMethod = (request, name) => {
  const { method, url, header, body } = request;

  let headers = {};

  header.forEach((h) => {
    headers[h.key] = h.value;
  });

  let data;

  try {
    data =
      body?.mode === "raw" && body.raw != "" && typeof body.raw == "OBJECT"
        ? JSON.parse(body.raw)
        : {};
  } catch (error) {
    console.log(error);
  }

  return `
    ${name}: async ( ${
    data ? (Object.keys(data).length ? "data" : "") : ""
  }) => {
      return axios.${request.method.toLowerCase()}('${url.raw}', ${
    Object.keys(data).length ? "data" : "{}"
  }, { headers: ${JSON.stringify(headers)} })
        .then(response => response.data)
        .catch(error => { throw error; });
    },
  `;
};

// Function to generate service file content
const generateServiceFileContent = (items) => {
  let methods = "";

  items.forEach((itemCollection) => {
    let child_methods_small;
    let child_methods;

    if (!itemCollection?.[0]?.item && !itemCollection?.item?.[0]) {
      let child_all_items_small = "";

      let functionString = convertRequestToAxiosMethod(
        itemCollection.request,
        itemCollection.name
          .replaceAll(" ", "_")
          .replaceAll("'", "")
          .replaceAll(":", "_")
      );

      child_all_items_small += functionString;

      child_methods_small = `${itemCollection.name
        .replaceAll(" ", "_")
        .replaceAll("'", "")
        .replaceAll(":", "_")}: {
              ${child_all_items_small}
        }`;

      methods += child_methods_small + " ,";
    } else if (!itemCollection?.item?.[0]?.item) {
      let child_all_items_small = "";
      itemCollection.item.forEach((child_item) => {
        let functionString = convertRequestToAxiosMethod(
          child_item.request,
          child_item.name
            .replaceAll(" ", "_")
            .replaceAll("'", "")
            .replaceAll(":", "_")
        );

        child_all_items_small += functionString;
      });
      child_methods_small = `${itemCollection.name
        .replaceAll(" ", "_")
        .replaceAll("'", "")
        .replaceAll(":", "_")}: {
            ${child_all_items_small}
      }`;

      methods += child_methods_small + " ,";
    } else {
      itemCollection.item.forEach((child_item) => {
        let child_all_items = "";

        for (let crud in child_item.item) {
          let functionString = convertRequestToAxiosMethod(
            child_item.item[crud].request,
            child_item.item[crud].name
              .replaceAll(" ", "_")
              .replaceAll("'", "")
              .replaceAll(":", "_")
          );

          child_all_items += functionString;
        }

        child_methods = `${itemCollection.name
          .replaceAll(" ", "_")
          .replaceAll("'", "")
          .replaceAll(":", "_")}: {
            ${child_all_items}
      }`;
      });

      methods += child_methods + " ,";
    }
  });

  return `
import axios from 'axios';

const Service = {${methods}
};

export default Service;
  `;
};

// Main function to read Postman collection and generate service file
const convertPostmanCollectionToAxiosService = (filePath, fileName) => {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      console.error("Error reading file:", err);
      return;
    }

    const collection = JSON.parse(data);
    const content = generateServiceFileContent(collection.item);

    fs.writeFile(`./AxiosFiles/${fileName}_service.js`, content, (err) => {
      if (err) {
        console.error("Error writing service file:", err);
        return;
      }

      console.log("Service file generated successfully.");
    });
  });
};

fs.readdir(directoryPath, function (err, files) {
  // Hata kontrolü
  if (err) {
    return console.log("Hata: " + err);
  }

  // JSON dosyalarını filtrele
  jsonFiles = files.filter(function (file) {
    return path.extname(file).toLowerCase() === ".json";
  });

  for (let i = 0; i < jsonFiles.length; i++) {
    convertPostmanCollectionToAxiosService(
      `./PostmanCollectionFiles/${jsonFiles[i]}`,
      jsonFiles[i].replace(".json", "")
    );
  }
});
