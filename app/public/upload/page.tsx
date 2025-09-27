import { cookies } from "next/headers"
import { UploadClient } from "./upload-client"

type WorkflowSource = "meta" | "youtube"

const isWorkflowSource = (value: string | undefined): value is WorkflowSource => {
  return value === "meta" || value === "youtube"
}

export default async function UploadPage() {
  const cookieStore = await cookies()
  const sourceCookie = cookieStore.get("selectedSource")?.value
  const initialSource: WorkflowSource = isWorkflowSource(sourceCookie) ? sourceCookie : "meta"

  return <UploadClient initialSource={initialSource} />
}
