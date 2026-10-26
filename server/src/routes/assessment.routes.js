const router = require("express").Router();
const controller = require("../controllers/assessment.controller");
router.post("/", controller.create);
router.get("/:id", controller.getById);
router.post("/:id/reassess", controller.reassess);
module.exports = router;
