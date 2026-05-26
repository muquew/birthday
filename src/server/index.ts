import { createServerApp } from "./app.js";
import { config } from "./config.js";

const app = createServerApp();

app.listen(config.port, config.host, () => {
  console.log(
    `Birthday site server listening on http://${config.host}:${config.port}${config.basePath}`
  );
});
