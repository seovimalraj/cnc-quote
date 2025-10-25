import { Processor } from "@nestjs/bullmq";
import { Job } from "bullmq";

@Processor("cad")
export class CadProcessor {
  async analyze(_job: Job) {
    // TODO: Implement CAD analysis
    return { status: "processed" };
  }
}
