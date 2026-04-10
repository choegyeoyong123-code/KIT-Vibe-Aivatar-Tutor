import { MemorySaver } from "@langchain/langgraph";

/**
 * 개발·데모용 인메모리 체크포인터. 프로덕션에서는 Postgres/SQLite 등 영속 saver로 교체하세요.
 * 동일 thread_id로 invoke 시 LangGraph가 상태를 이어 받습니다.
 */
let saver: MemorySaver | null = null;

export function getCheckpointer(): MemorySaver {
  if (!saver) saver = new MemorySaver();
  return saver;
}
