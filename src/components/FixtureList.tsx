import {
  extractDateKey,
  formatDateLabel,
  formatMatchdayLabel,
  getTodayDateKey,
} from '../lib/format';
import type { MatchItem } from '../types/football';
import { MatchRow } from './MatchRow';

export interface FixtureListProps {
  fixtures: MatchItem[];
  fallbackDateKey?: string;
  isStale?: boolean;
  groupByMatchday?: boolean;
  showDateHeaders?: boolean;
}

interface MatchdayGroup {
  key: string;
  label: string;
  items: MatchItem[];
}

interface CompetitionGroup {
  competitionId: string;
  competitionName: string;
  matchdays: MatchdayGroup[];
}

interface DateGroup {
  dateKey: string;
  dateLabel: string;
  competitions: CompetitionGroup[];
}

function sortByKickoff(items: MatchItem[]): MatchItem[] {
  return [...items].sort((a, b) => {
    const timeA = a.kickoffAt || '';
    const timeB = b.kickoffAt || '';
    return timeA.localeCompare(timeB);
  });
}

function buildGroups(
  fixtures: MatchItem[],
  fallbackDateKey: string,
  groupByMatchday: boolean,
): DateGroup[] {
  const todayKey = getTodayDateKey();
  const byDate = new Map<string, MatchItem[]>();

  for (const fixture of sortByKickoff(fixtures)) {
    const dateKey = extractDateKey(fixture.kickoffAt) ?? fallbackDateKey;
    const list = byDate.get(dateKey);
    if (list) {
      list.push(fixture);
    } else {
      byDate.set(dateKey, [fixture]);
    }
  }

  const sortedDateKeys = Array.from(byDate.keys()).sort((a, b) =>
    a.localeCompare(b),
  );

  return sortedDateKeys.map((dateKey) => {
    const dateItems = byDate.get(dateKey) ?? [];
    const byComp = new Map<
      string,
      { name: string; items: MatchItem[] }
    >();

    for (const item of dateItems) {
      const compKey = String(item.competition.id || item.competition.name);
      const existing = byComp.get(compKey);
      if (existing) {
        existing.items.push(item);
      } else {
        byComp.set(compKey, {
          name: item.competition.name,
          items: [item],
        });
      }
    }

    const competitions: CompetitionGroup[] = Array.from(byComp.entries()).map(
      ([compKey, compData]) => {
        if (!groupByMatchday) {
          return {
            competitionId: compKey,
            competitionName: compData.name,
            matchdays: [
              {
                key: 'all',
                label: '',
                items: compData.items,
              },
            ],
          };
        }

        const byMatchday = new Map<string, MatchItem[]>();
        for (const item of compData.items) {
          const mdLabel = formatMatchdayLabel(item.matchday);
          const mdKey = mdLabel || '__none__';
          const list = byMatchday.get(mdKey);
          if (list) {
            list.push(item);
          } else {
            byMatchday.set(mdKey, [item]);
          }
        }

        const matchdays: MatchdayGroup[] = Array.from(byMatchday.entries()).map(
          ([mdKey, items]) => ({
            key: mdKey,
            label: mdKey === '__none__' ? '' : mdKey,
            items,
          }),
        );

        return {
          competitionId: compKey,
          competitionName: compData.name,
          matchdays,
        };
      },
    );

    return {
      dateKey,
      dateLabel: formatDateLabel(dateKey, todayKey),
      competitions,
    };
  });
}

export function FixtureList({
  fixtures,
  fallbackDateKey = getTodayDateKey(),
  isStale = false,
  groupByMatchday = false,
  showDateHeaders = true,
}: FixtureListProps) {
  const groups = buildGroups(fixtures, fallbackDateKey, groupByMatchday);

  return (
    <div className="space-y-6">
      {groups.map((dateGroup) => (
        <section
          key={dateGroup.dateKey}
          aria-label={dateGroup.dateLabel}
          className="space-y-4"
        >
          {showDateHeaders ? (
            <div className="flex items-center justify-between border-b border-[#2A3730] pb-2">
              <h3 className="text-[14px] leading-[20px] font-semibold text-[#F2F6F3]">
                {dateGroup.dateLabel}
              </h3>
              <span className="tabular-nums-strict type-metadata text-[#A0ADA5]">
                {dateGroup.competitions.reduce(
                  (sum, comp) =>
                    sum +
                    comp.matchdays.reduce((s, md) => s + md.items.length, 0),
                  0,
                )}{' '}
                {dateGroup.competitions.reduce(
                  (sum, comp) =>
                    sum +
                    comp.matchdays.reduce((s, md) => s + md.items.length, 0),
                  0,
                ) === 1
                  ? 'match'
                  : 'matches'}
              </span>
            </div>
          ) : null}

          <div className="space-y-4">
            {dateGroup.competitions.map((comp) => (
              <div key={comp.competitionId} className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="type-metadata font-semibold tracking-wide text-[#A0ADA5] uppercase">
                    {comp.competitionName}
                  </h4>
                </div>

                {comp.matchdays.map((md) => (
                  <div key={md.key} className="space-y-2">
                    {md.label ? (
                      <div className="type-metadata font-medium text-[#9DB8FF]">
                        {md.label}
                      </div>
                    ) : null}
                    <ul className="space-y-2">
                      {md.items.map((match) => (
                        <li key={match.id}>
                          <MatchRow match={match} isStale={isStale} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
