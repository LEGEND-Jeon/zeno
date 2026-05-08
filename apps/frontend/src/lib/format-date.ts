import { tz } from "@date-fns/tz";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

const SEOUL_TIME_ZONE = "Asia/Seoul";

export function formatKoreanTimestamp(value: string | Date) {
  return format(value, "yyyy.MM.dd a h:mm", {
    locale: ko,
    in: tz(SEOUL_TIME_ZONE),
  });
}
