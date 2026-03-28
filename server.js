  const express = require("express");
  const mongoose = require("mongoose");
  const path = require("path");
  const session = require("express-session");
  const bcrypt = require("bcrypt");

  const app = express();
  const PORT = process.env.PORT || 8000;
  const cors = require("cors");
  app.use(cors());


// MODELS
const Notice = require("./models/notic");
const Admin = require("./models/admin");
const upload = require("./middleware/multer");
const Student = require("./models/student_regrestration");

// DATABASE
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("MongoDB Error:", err));

// MIDDLEWARE
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static("public"));

app.use(session({
  secret: "secretkey",
  resave: false,
  saveUninitialized: false
}));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// 🔐 AUTH MIDDLEWARE
const isAdminLoggedIn = (req, res, next) => {
  if (!req.session.adminId) {
    return res.redirect("/admin/login");
  }
  next();
};

// ===================
// PUBLIC ROUTES
// ===================

app.get("/", (req, res) => {
  res.render("firstpage");
});

app.get("/Home/event", (req, res) => {
  res.render("event");
});

app.get("/Home/gallary", (req, res) => {
  res.render("gallary");
});

app.get("/Home/noticboard", async (req, res) => {
  const notices = await Notice.find().sort({ _id: -1 });
  res.render("noticboard", { notices });
});

// ===================
// ADMIN AUTH SYSTEM
// ===================

// Entry point
app.get("/admin", async (req, res) => {
  const admin = await Admin.findOne();
  if (!admin) return res.redirect("/admin/register");
  res.redirect("/admin/login");
});

// Register page
app.get("/admin/register", async (req, res) => {
  const admin = await Admin.findOne();
  if (admin) return res.redirect("/admin/login");
  res.render("register");
});

// Register (with bcrypt)
app.post("/admin/register", async (req, res) => {
  const existingAdmin = await Admin.findOne();
  if (existingAdmin) return res.send("Registration closed");

  const { name, email, password } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  const newAdmin = new Admin({
    name,
    email,
    password: hashedPassword
  });

  await newAdmin.save();

  res.redirect("/admin/login");
});

// Login page
app.get("/admin/login", (req, res) => {
  res.render("login");
});

// Login
app.post("/admin/login", async (req, res) => {
  const { email, password } = req.body;

  const admin = await Admin.findOne({ email });
  if (!admin) return res.send("Admin not found");

  const isMatch = await bcrypt.compare(password, admin.password);
  if (!isMatch) return res.send("Wrong password");

  req.session.adminId = admin._id;

  res.redirect("/admin_panel");
});

// Logout
app.get("/admin/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/admin/login");
  });
});

// ===================
// ADMIN PANEL
// ===================

// Dashboard
app.get("/admin_panel", isAdminLoggedIn, async (req, res) => {
  const totalNotices = await Notice.countDocuments();
  const totalStudents = await Student.countDocuments();

  res.render("admin_panel", {
    totalNotices,
    totalStudents
  });
});

// Add Notice page
app.get("/admin_panel/notice", isAdminLoggedIn, (req, res) => {
  res.render("admin_panel_notice");
});

// Save Notice
app.post("/admin_panel/notice", isAdminLoggedIn, upload.single("photo"), async (req, res) => {
  const newNotice = new Notice({
    title: req.body.title,
    image: req.file.filename
  });

  await newNotice.save();
  res.redirect("/admin_panel/notice");
});

// Manage Notices
app.get("/manage_notice", isAdminLoggedIn, async (req, res) => {
  const notices = await Notice.find().sort({ _id: -1 });
  res.render("mangae_notic", { notices });
});

// Delete Notice
app.post("/admin_panel/notice/delete/:id", isAdminLoggedIn, async (req, res) => {
  await Notice.findByIdAndDelete(req.params.id);
  res.redirect("/manage_notice");
});

// Edit Notice page
app.get("/admin_panel/notice/edit/:id", isAdminLoggedIn, async (req, res) => {
  const notice = await Notice.findById(req.params.id);
  res.render("edit_notice", { notice });
});

// Update Notice
app.post("/admin_panel/notice/edit/:id", isAdminLoggedIn, upload.single("image"), async (req, res) => {
  const { id } = req.params;
  const { title } = req.body;

  let updateData = { title };

  if (req.file) {
    updateData.image = req.file.filename;
  }

  await Notice.findByIdAndUpdate(id, updateData);

  res.redirect("/manage_notice");
});

// ===================
// STUDENT REGISTRATION
// ===================

// Register page
app.get("/student", (req, res) => {
  res.render("student_register");
});

// Register student
app.post("/register", async (req, res) => {
  try {
    // 🔒 safety check
    if (!req.body) {
      return res.status(400).send("No data received ❌");
    }

    let { name, email, rollno, phone, activity } = req.body;

    // 🔒 required fields check
    if (!name || !email || !rollno || !phone) {
      return res.send("All fields are required ❌");
    }

    // 🔥 fix activity undefined issue
    if (!activity) activity = [];

    if (!Array.isArray(activity)) {
      activity = [activity];
    }

    activity = activity.map(a => a.toLowerCase().trim());

    // 🔍 check existing user
    let existing = await Student.findOne({ email: email.toLowerCase() });

    if (existing) {
      const newActivities = activity.filter(
        a => !existing.activity.includes(a)
      );

      if (newActivities.length === 0) {
        return res.send("Already registered ❌");
      }

      existing.activity.push(...newActivities);
      existing.name = name;
      existing.rollno = rollno;
      existing.phone = phone;

      await existing.save();

      return res.send("Updated successfully ✅");
    }

    // 🆕 create new student
    const student = new Student({
      name,
      email: email.toLowerCase(),
      rollno,
      phone,
      activity
    });

    await student.save();

    res.send("Registration successful ✅");

  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.status(500).send("Server error ❌");
  }
});

// Show students (protected)
app.get("/admin_panel/students", isAdminLoggedIn, async (req, res) => {
  const students = await Student.find().sort({ createdAt: -1 });
  res.render("student_regrestiin_show_to_admin", { students });
});

// Delete student (protected)
app.post("/admin_panel/students/delete/:id", isAdminLoggedIn, async (req, res) => {
  await Student.findByIdAndDelete(req.params.id);
  res.redirect("/admin_panel/students");
});




app.get("/education", (req, res) => {
  res.render("include/education");
});

app.get("/adi", (req, res) => {
  res.render("include/adi");
});

app.get("/abo", (req, res) => {
  res.render("include/about")
})

app.get("/cam", (req, res) => {
  res.render("campuslife");
});

app.get("/research", (req, res) => {
  res.render("resarch");
});

app.get("/ali", (req, res) => {
  res.render("include/alimu");
});

app.get("/invo", (req, res) => {
  res.render("include/invo");
})
app.get("/life", (req, res) => {
  res.render("include/life_long");
});



app.get("/cultural", (req, res) => {
  res.render("cultural.ejs");
});

app.get("/game", (req, res) => {
  res.render("game");
});

app.get("/fun_art", (req, res) => {
  res.render("fun_art");
});


app.get("/tech", (req, res) => {
  res.render("techology");
});


app.get("/sign", (req, res) => {
  res.render("singing");
});

app.get("/lit", (req, res) => {
  res.render("lit");
});


app.get("/teacher", (req, res) => {
  res.render("teacher");
});




// ERROR HANDLER
// ===================

app.use((req, res) => {
  res.status(404).send("Page Not Found");
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something went wrong");
});



app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});