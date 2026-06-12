import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import patientsRouter from "./patients";
import appointmentsRouter from "./appointments";
import clinicalRouter from "./clinical";
import prescriptionsRouter from "./prescriptions";
import labRouter from "./lab";
import billingRouter from "./billing";
import pharmacyRouter from "./pharmacy";
import staffRouter from "./staff";
import vaccinationsRouter from "./vaccinations";
import dashboardRouter from "./dashboard";
import admissionsRouter from "./admissions";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(patientsRouter);
router.use(appointmentsRouter);
router.use(clinicalRouter);
router.use(prescriptionsRouter);
router.use(labRouter);
router.use(billingRouter);
router.use(pharmacyRouter);
router.use(staffRouter);
router.use(vaccinationsRouter);
router.use(dashboardRouter);
router.use(admissionsRouter);

export default router;
