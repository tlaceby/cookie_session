import { opine } from "https://deno.land/x/opine@2.2.0/mod.ts";
import cookieSession from "./mod.ts";

const app = opine();
cookieSession(app, {
  sameSite: "Strict",
  secure: true,
  maxAge: 10 * 60, // 10 mins
  httpOnly: true,
});

app.get("/", (req, res) => {
  const session = req.session;
  let count = 0;
  if (session.has("count")) {
    count = session.get("count");
  }

  session.insert("count", ++count).save();

  if (count == 10) {
    session.clear();
  }

  res.send(`Count: ${count}`);
});

app.listen(8000);
console.log("http://localhost:8000/");
