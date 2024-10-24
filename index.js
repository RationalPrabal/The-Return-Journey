require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const PORT = process.env.PORT || 3000;
const { authRouter } = require("./routes/auth.routes");
const { connection } = require("./configs/database");
const { eventRouter } = require("./routes/event.routes");
const { calendarRouter } = require("./routes/calendar.routes");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

//! options to configure swagger
const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Event Management App",
      version: "1.0.0",
    },
  },
  apis: ["./routes/*.js"],
};

const openapiSpecification = swaggerJsdoc(options);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openapiSpecification));

app.use(express.json());
app.use(
  cors({
    origin: "*",
  })
);

//! routes
app.use("/api/auth", authRouter);
app.use("/api/event", eventRouter);
app.use("/api/calendar", calendarRouter);

//! database connection and running the server
app.listen(PORT, async () => {
  try {
    await connection;
    console.log("Database connected");
  } catch (err) {
    console.log("Database connection error");
  }
  console.log(`Server is up and running at ${PORT}`);
});
