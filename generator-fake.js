//import fake
var faker = require("faker");
const Random = require("faker/lib/random");
var fs = require("fs");
// create a file called "data.json"
var data = {
  cardposts: [],
  images: [
    "https://dl.airtable.com/.attachments/bf8d028ac55af3905b4a173198b05aab/7d43ebfd/americanpurpose.png",
    "https://dl.airtable.com/.attachments/66248dd7305d6b9961be4a8b516aafd8/9885b649/thegradient.png",
    "https://dl.airtable.com/.attachments/a36221803d6869b04bd993d7c9931bc7/20c63602/quillette.jpg",
    "https://dl.airtable.com/.attachments/1e8bf71afa0d5df2c51703e101e26530/e212e593/guideline.jpg",
    "https://dl.airtable.com/.attachments/00073e701b063ce81d287f73ef8e80f6/bf4dc622/marcuswermuth.png",
    "https://dl.airtable.com/.attachments/9e2675109a599c4dad6b07859d1eefab/8c57d567/harvard.png",
    "https://dl.airtable.com/.attachments/f8f2ac16bb39b2162093d98802bd74df/16e6fab1/borderlinepod.jpg",
    "https://dl.airtable.com/.attachments/2e01d0504224516fcd7142c2b1184df3/960fe525/iainbroome.png",
    "https://dl.airtable.com/.attachments/505e0aee66a3a05684e258e8c9d3e03a/a329e769/saralobkovich.jpg",
  ],
};
// create 20 cardposts
for (var i = 0; i < 40; i++) {
  data.cardposts.push({
    id: faker.random.uuid(),
    title: faker.lorem.sentence(),
    body: faker.lorem.paragraph(),
    image: data.images[Math.floor(Math.random() * data.images.length)],
    datetime: faker.date.past(),
  });
}
// write the data to the file
fs.writeFile("data.json", JSON.stringify(data), function (err) {
  if (err) {
    console.log("Error writing file", err);
  } else {
    console.log("Successfully wrote file");
  }
});
