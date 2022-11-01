import { opine } from "https://deno.land/x/opine@2.2.0/mod.ts";
import cookieSession, { MongoSessionStore } from "./mod.ts";

const app = opine();
cookieSession(app, {
  maxAge: 15,
  httpOnly: true,
  store: await MongoSessionStore("mongodb://127.0.0.1:27017"),
});

app.get("/", async (req, res) => {
  const session = req.session;
  let count = 0;
  if (session.has("count")) {
    count = session.get("count");
  }

  session.insert("count", ++count);
  await session.save();

  if (count == 10) {
    await session.clear();
  }

  res.send(`Count: ${count}`);
});

app.listen(8000);
console.log("http://localhost:8000/");
