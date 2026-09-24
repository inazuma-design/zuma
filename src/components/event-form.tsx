import { ActionForm } from "@/components/action-form";
import { GateSelect } from "@/components/gate-select";
import { saveEvent } from "@/lib/actions";
import { toJstInput } from "@/lib/format";
import type { ClubEvent, Plan } from "@/lib/types";

export function EventForm({ plans, event }: { plans: Plan[]; event?: ClubEvent }) {
  return (
    <ActionForm action={saveEvent} submitLabel={event ? "更新する" : "作成する"} className="card space-y-4 p-6">
      {event && <input type="hidden" name="eventId" value={event.id} />}
      <div>
        <label className="label" htmlFor="title">イベント名</label>
        <input id="title" name="title" className="input" defaultValue={event?.title} required maxLength={80} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="startsAt">開催日時（日本時間）</label>
          <input id="startsAt" name="startsAt" type="datetime-local" className="input" defaultValue={event ? toJstInput(event.starts_at) : undefined} required />
        </div>
        <div>
          <label className="label" htmlFor="kind">形式</label>
          <select id="kind" name="kind" className="input" defaultValue={event?.kind ?? "online"}>
            <option value="online">オンライン（ライブ配信）</option>
            <option value="offline">オフライン（会場開催）</option>
          </select>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="streamUrl">配信URL（オンラインの場合・参加登録者にのみ表示）</label>
        <input id="streamUrl" name="streamUrl" type="url" className="input" defaultValue={event?.stream_url} placeholder="https://www.youtube.com/live/..." />
      </div>
      <div>
        <label className="label" htmlFor="location">会場（オフラインの場合）</label>
        <input id="location" name="location" className="input" defaultValue={event?.location} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="capacity">定員（0で無制限）</label>
          <input id="capacity" name="capacity" type="number" min={0} className="input" defaultValue={event?.capacity ?? 0} />
        </div>
        <GateSelect plans={plans} defaultValue={event?.min_price} publicLabel="ログインユーザー全員" />
      </div>
      <div>
        <label className="label" htmlFor="description">詳細</label>
        <textarea id="description" name="description" className="input min-h-32" defaultValue={event?.description} />
      </div>
    </ActionForm>
  );
}
