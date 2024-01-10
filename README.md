# ```algolia-query-rules-to-typesense```

This is a simple CLI utility to convert query rules from Algolia to Typesense's Override API JSON.

## Usage:

```bash
npx algolia-query-rules-to-typesense <path/to/algolia_rules_export.json> <path/to/typesense_overrides_output.json>
```

To get `algolia_rules_export.json`, go to the "Rules" section of your Algolia index, and you'll find a download icon to export the rules as JSON.

This is the expected format of `algolia_rules_export.json`:

```json
[
  {
    "description": "Test Rule",
    "conditions": [
      {
        "anchoring": "is",
        "pattern": "keyword",
        "alternatives": true
      }
    ],
    "consequence": {
      "params": {
        "filters": "..."
      },
      "filterPromotes": true
    },
    "enabled": true,
    "objectID": "qr-1682441011"
  }
]
```

After running this command, the output JSON will be in this format:

```json
[
  {
    "id": "Test Rule - qr-1682441011",
    "rule": {
      "query": "keyword",
      "match": "exact"
    },
    "filter_curated_hits": true,
    "filter_by": "..."
  }
]
```

You can then import these JSON rules into Typesense using the [Typesense API](https://typesense.org/docs/0.25.2/api/curation.html#create-or-update-an-override).
