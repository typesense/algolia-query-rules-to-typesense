#! /usr/bin/env node

const fs = require("fs");

const algoliaRulesJSONFilePath = process.argv[2];
const typesenseOverridesJSONFilePath = process.argv[3];

if (!algoliaRulesJSONFilePath || !typesenseOverridesJSONFilePath) {
  console.log(
    `Usage: npx algolia-query-rules-to-typesense <path_to_algolia_rules_json_file> <path_to_output_typesense_overrides_json_file>`,
  );
  process.exit(1);
}

function convertAlgoliaFilterToTypesense(algoliaFilter) {
  return algoliaFilter
    .replace(/\(?"([^"]+)": ?"([^"]+)"\)?/g, "$1:=[`$2`]")
    .replace(/ AND /g, " && ");
}

function convertAlgoliaRuleToTypesense(algoliaRule) {
  let typesenseOverrides = [];
  console.log(
    `===> Rule: ${algoliaRule.description} - ${algoliaRule.objectID}`,
  );

  if (algoliaRule.enabled === false) {
    console.log(`Rule is disabled, skipping`);
    return null;
  }

  algoliaRule.conditions?.forEach((algoliaCondition, index) => {
    let typesenseOverride = {};
    typesenseOverrides.push(typesenseOverride);

    typesenseOverride.id = `${
      algoliaRule.description || algoliaRule.objectID
    } - ${index}`;

    // Conditions

    // Curate by Keyword
    if (
      algoliaCondition.anchoring != null &&
      algoliaCondition.pattern != null
    ) {
      typesenseOverride.rule = typesenseOverride.rule ?? {};
      typesenseOverride.rule.query =
        algoliaCondition.pattern === "" ? "*" : algoliaCondition.pattern;
      typesenseOverride.rule.match =
        algoliaCondition.anchoring === "is" ? "exact" : "contains";
    }

    // Curate by Filter
    if (algoliaCondition.filters != null) {
      typesenseOverride.rule = typesenseOverride.rule ?? {};
      typesenseOverride.rule.filter = convertAlgoliaFilterToTypesense(
        algoliaCondition.filters,
      );
    }

    // Curate by Tags
    if (algoliaCondition.context != null) {
      typesenseOverride.rule = typesenseOverride.rule ?? {};
      typesenseOverride.rule.tags = [algoliaCondition.context];
    }
  });

  // Consequences

  // if (algoliaRule.consequence != null) {
  //   console.log(
  //     `consequence: ${Object.keys(algoliaRule.consequence).join(", ")}`,
  //   );
  //   if (algoliaRule.consequence.params != null) {
  //     console.log(
  //       `consequence.params: ${Object.keys(algoliaRule.consequence.params).join(
  //         ", ",
  //       )}`,
  //     );
  //   }
  // }

  typesenseOverrides.forEach((typesenseOverride) => {
    // Pinned Hits
    if (algoliaRule.consequence?.promote?.length > 0) {
      typesenseOverride.includes = algoliaRule.consequence?.promote?.map(
        (algoliaPromoteItem) => {
          return {
            id: algoliaPromoteItem.objectIDs[0],
            position: algoliaPromoteItem.position,
          };
        },
      );
    }

    // Hidden Hits
    if (algoliaRule.consequence?.hide?.length > 0) {
      typesenseOverride.excludes = algoliaRule.consequence?.hide?.map(
        (algoliaHideItem) => {
          return {
            id: algoliaHideItem.objectID,
          };
        },
      );
    }

    // Custom Metadata
    if (algoliaRule.consequence?.userData != null) {
      typesenseOverride.metadata = algoliaRule.consequence?.userData;
    }

    // Filter Curated Hits
    if (algoliaRule.consequence?.filterPromotes != null) {
      typesenseOverride.filter_curated_hits =
        algoliaRule.consequence?.filterPromotes;
    }

    // filter_by
    if (algoliaRule.consequence?.params?.filters != null) {
      typesenseOverride.filter_by = convertAlgoliaFilterToTypesense(
        algoliaRule.consequence?.params?.filters,
      );
    }

    // optionalFilters
    if (algoliaRule.consequence?.params?.optionalFilters != null) {
      console.warn(
        `*** consequence.params.optionalFilters is not supported by this script. Please set it manually using filter_by in the curation rule ***`,
      );
    }

    // Replace query
    if (
      algoliaRule.consequence?.params?.query?.edits != null &&
      algoliaRule.consequence?.params?.query?.edits[0].type === "replace"
    ) {
      typesenseOverride.replace_query =
        algoliaRule.consequence?.params?.query?.edits[0].insert;
    }

    // Date Validity
    if (algoliaRule.validity?.length > 0) {
      typesenseOverride.effective_from_ts = algoliaRule.validity[0].from;
      typesenseOverride.effective_to_ts = algoliaRule.validity[0].until;
    }
  });

  return typesenseOverrides;
}

const writeTypesenseOverridesToFile = (overrides, filePath) => {
  try {
    const data = JSON.stringify(overrides, null, 2); // Converts the array to a JSON string, formatted for readability
    fs.writeFileSync(filePath, data, "utf8");
    console.log(`Typesense Overrides successfully written to ${filePath}`);
  } catch (error) {
    console.error("Error writing overrides to file:", error);
  }
};

const main = async () => {
  try {
    const algoliaRules = [
      JSON.parse(fs.readFileSync(algoliaRulesJSONFilePath, "utf8")),
    ].flat();

    const typesenseOverrides = algoliaRules
      .map((algoliaRule) => convertAlgoliaRuleToTypesense(algoliaRule))
      .filter((r) => r)
      .flat();

    writeTypesenseOverridesToFile(
      typesenseOverrides,
      typesenseOverridesJSONFilePath,
    );
  } catch (error) {
    console.error("Error:", error);
  }
};

main();
