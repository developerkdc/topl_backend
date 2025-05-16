import { Router } from 'express';
import issue_for_packing_router from './issue_for_packing/issue_for_packing.routes.js';
import packing_done_router from './packing_done/packing_done.routes.js';

const all_packing_router = Router();

//issue-for-packing
all_packing_router.use('/issue-for-packing', issue_for_packing_router);

//packing done
all_packing_router.use('/packing-done', packing_done_router);
export default all_packing_router;
