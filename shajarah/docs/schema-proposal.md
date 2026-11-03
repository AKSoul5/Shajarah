# Database additions: proposed schema and migration

Status: proposal, awaiting approval. Nothing here is applied.

Every change below **adds**: new tables, or new optional columns. No column
is removed, renamed or changed in meaning. Existing data, project files,
GEDCOM import/export, undo and merge keep working unchanged before any
new field is used.

## 1. What the design covers

| Requirement | Where |
| --- | --- |
| Full, partial, approximate and unknown dates; Hijri and Gregorian | `Event` date fields (§2.2) |
| Arabic and English names | `Member.nameEn`, `NameVariant` (§2.1) |
| Biography separate from notes | `Member.biography` (§2.1) |
| Birthplaces and residences | `Event.place`, `Event.country` (§2.2) |
| Typed family relationships | `ParentLink` (§2.3) |
| Historical events | `Event` (§2.2) |
| Sources and citations | `Citation.eventId` (§2.4) |

## 2. Schema

### 2.1 Member: names and biography

```prisma
model Member {
  // … every existing field unchanged …
  nameEn     String?   // the name in Latin script, as the family writes it
  biography  String?   // the life story; `notes` stays the working notes
  variants   NameVariant[]
  events     Event[]   @relation("EventPerson")
  parentLinksAsChild  ParentLink[] @relation("LinkChild")
  parentLinksAsParent ParentLink[] @relation("LinkParent")
}

/** Other names a person is known by: a kunya, a former name, a spelling. */
model NameVariant {
  id       String  @id @default(cuid())
  memberId String
  member   Member  @relation(fields: [memberId], references: [id], onDelete: Cascade)
  name     String
  kind     NameKind @default(ALIAS)   // ALIAS, KUNYA, BIRTH_NAME, SPELLING
  script   String?  // "ar", "en", …
  @@index([memberId])
}
```

- **`name`** stays the primary name, in whatever script it was entered.
- **`laqab`** stays the honorific.
- **Search** covers `name`, `nameEn`, `laqab` and the variants.

### 2.2 Event: dates, places and history

```prisma
model Event {
  id         String     @id @default(cuid())
  treeId     String
  tree       FamilyTree @relation(fields: [treeId], references: [id], onDelete: Cascade)
  type       EventType  // BIRTH, DEATH, MARRIAGE, DIVORCE, RESIDENCE, MIGRATION,
                        // EDUCATION, OCCUPATION, PILGRIMAGE, MILITARY, BURIAL, OTHER
  title      String?    // for OTHER, or a heading ("Moved to Kuwait")
  memberId   String?    // the person (null for a marriage event)
  member     Member?    @relation("EventPerson", fields: [memberId], references: [id], onDelete: Cascade)
  marriageId String?    // for MARRIAGE / DIVORCE
  marriage   Marriage?  @relation(fields: [marriageId], references: [id], onDelete: Cascade)

  // The date, as recorded
  calendar   Calendar   @default(GREGORIAN)  // GREGORIAN | HIJRI
  year       Int?
  month      Int?
  day        Int?
  qualifier  DateQualifier @default(EXACT)   // EXACT, ABOUT, BEFORE, AFTER, BETWEEN, ESTIMATED
  year2      Int?       // the end of a BETWEEN range (same calendar)
  dateText   String?    // the date exactly as the source gives it, kept verbatim

  // Derived for sorting and analytics (never shown as if recorded)
  sortFrom   Int?       // earliest Gregorian year the recorded date allows
  sortTo     Int?       // latest

  place      String?    // the place as the family writes it ("Mecca", "حي الشامية")
  country    String?    // ISO 3166-1 alpha-2, only when the country is known
  notes      String?
  citations  Citation[]
  createdAt  DateTime   @default(now())
  @@index([treeId])
  @@index([memberId])
  @@index([marriageId])
}
```

- **An unknown date** has no year, month or day. "Died, date unknown" is a
  DEATH event without a date.
- **A partial date** is a year, or a month and year.
- **Approximate dates** use the qualifier ("about 1350 هـ", "before 1920",
  "between 1890 and 1895").
- **Hijri dates** are stored as Hijri.
  - `sortFrom`/`sortTo` hold the Gregorian years the date covers. A
    Hijri year spans two Gregorian years, so both are kept and nothing is
    rounded.
  - Analytics use only dates whose range is narrow enough, and say how many
    people they left out.
- **Residence** is an event (RESIDENCE, possibly with a date range).
  "Current residence" is the latest one without an end. A person can have
  several over a lifetime, which the migration map needs.
- **Country** is optional and separate from the place text. It is never
  inferred from the place name.

**The existing year columns stay.**
- `birthYear` / `deathYear` / `isDeceased`, and `Marriage.startYear` /
  `endYear`, are kept.
- When a BIRTH or DEATH event is saved, the service fills the year column
  from it, but only when the date is a single Gregorian year, or a
  Hijri/partial date whose Gregorian range is one year. Otherwise the
  column is left as it is.
- Every current calculation, the poster engine, and older project files
  keep working unchanged.
- A year entered the old way, with no event, stays valid. The profile shows
  it as "born 1901".

### 2.3 ParentLink: typed relationships

`fatherId` / `motherId` keep exactly their current meaning: the **birth**
parents. Every existing query, the poster engine and GEDCOM stay correct
with no change. Other kinds of parenthood are links of their own:

```prisma
model ParentLink {
  id        String     @id @default(cuid())
  treeId    String
  tree      FamilyTree @relation(fields: [treeId], references: [id], onDelete: Cascade)
  childId   String
  child     Member     @relation("LinkChild", fields: [childId], references: [id], onDelete: Cascade)
  parentId  String
  parent    Member     @relation("LinkParent", fields: [parentId], references: [id], onDelete: Cascade)
  kind      ParentKind // ADOPTIVE, FOSTER, GUARDIAN (kafala), STEP
  fromYear  Int?
  toYear    Int?
  notes     String?
  @@unique([childId, parentId, kind])
  @@index([treeId])
}
```

- **A person can have** birth parents and adoptive parents together, more
  than one guardian, or a step-parent recorded explicitly.
- **Step-parents.** A step-parent is normally *derived*: the spouse of a
  birth parent who is not the other birth parent. The engine shows that
  without any record. A STEP link is only for recording it explicitly, for
  example someone raised by a step-father with dates.
- **Unknown parents** stay unknown: a null `fatherId` / `motherId`.

### 2.4 Sources and citations

```prisma
model Citation {
  // … existing fields …
  eventId String?   // the event this citation supports (optional)
  event   Event?    @relation(fields: [eventId], references: [id], onDelete: SetNull)
}
```

- A citation can support a person in general, as today, or a specific
  event: a birth date, a residence.
- `eventType` stays, for citations made before events existed.

### 2.5 Enums

`NameKind`, `EventType`, `Calendar`, `DateQualifier`, `ParentKind`, as listed
above.

## 3. Migration

1. **One Prisma migration, additive only.**
   - It contains `CREATE TABLE` for `NameVariant`, `Event`, `ParentLink`,
     plus `ALTER TABLE … ADD COLUMN` for `Member.nameEn`,
     `Member.biography`, `Citation.eventId`, and the `CREATE TYPE`
     statements for the enums.
   - No `DROP`, no `ALTER COLUMN`, no data rewritten.
2. **Desktop.**
   - The app already applies migrations itself at start, inside a
     transaction.
   - **New:** before applying any pending migration, it writes a backup of
     the database to `%APPDATA%\Shajarah\backups` (keeping the last five),
     and says so in the log.
   - If the migration fails, the transaction rolls back, the program shows
     the error and the backup's location, and nothing is lost.
3. **Server and browser.** `prisma migrate deploy`, as today.
4. **No backfill.**
   - Existing years are not turned into events. They remain years, shown as
     today.
   - Places and dates inside notes stay in the notes.
   - A later, optional tool may *offer* events read from notes, one person
     at a time, each confirmed by the family. Nothing is ever converted
     without that.

## 4. Compatibility

| | Behaviour |
| --- | --- |
| **Older project files** (format 1) | Open unchanged. The new fields are empty. |
| **New project files** (format 2) | Include events, links and variants. An older program refuses them with "saved by a newer version, update the app" (already its behaviour), never a silent loss. |
| **GEDCOM import** | `BIRT`/`DEAT`/`BURI`/`MARR`/`DIV`/`RESI`/`EDUC`/`OCCU`/`EVEN` become events, with `DATE` (including `ABT`, `BEF`, `AFT`, `BET … AND`, and `@#DHIJRI@` dates), `PLAC` and `ADDR`/`CTRY`. `NAME` variants (`ROMN`, `TRAN`, second `NAME`) become `nameEn` or variants. `FAMC` with `PEDI adopted/foster` and `ADOP` become `ParentLink`. Whatever is not mapped is still kept in the notes with its tag, as today: nothing is discarded. The preview lists what was mapped and what went to notes. |
| **GEDCOM export** | Writes all of the above back to the same tags. Unchanged for trees without the new data. |
| **Undo/redo and history** | Snapshots and the restore planner include the new tables. |
| **Merge of duplicate people** | Moves events, links, variants and citations to the kept record. |
| **Poster engine** | Unaffected (it reads names, years and birth parents only). It can use `nameEn` for English posters later, as a separate, regression-tested change. |

## 5. Tests that come with it

- **Migration:** applied to a copy of an existing database; every existing
  test passes before any new field is used.
- **Project files:**
  - a format-1 file opens;
  - a format-2 file round-trips;
  - an older reader refuses a newer file.
- **GEDCOM round trips:** dates with every qualifier, Hijri dates, places,
  residences, name variants, adoption, and unmapped tags kept in notes.
- **Year columns:** filled only from unambiguous dates; never overwritten
  by a vague one.
- **Merge and undo:** carry every new record.
