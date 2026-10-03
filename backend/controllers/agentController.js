import { askAgent } from "../services/agentService.js";

export async function chatWithAgent(req, res, next) {
  try {
    const {
      question,
      language = "vi",
    } = req.body;

    const result = await askAgent({
      question,
      language,
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}