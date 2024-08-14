import fs from "fs";
import _ from "lodash";
import { codes } from "./uid.json";
import {
  diseases as diseasesList,
  diseaseOptionSetId,
  diseaseTrackedEntityId,
  indicatorIds,
  statusOptionSetId,
  statusTrackedEntityId,
  incidentStatuses as incidentStatusesList,
} from "./constants";

interface Metadata {
  system: {
    id: string;
    rev: string;
    version: string;
    date: string;
  };
  options: Option[];
  programIndicators: Indicator[];
  trackedEntityAttributes: TrackedEntityAttribute[];
}

interface TrackedEntityAttribute {
  id: string;
  name: string;
  shortName: string;
  code: string;
}

interface Indicator {
  lastUpdated: string;
  id: string;
  created: string;
  name: string;
  shortName: string;
  aggregationType: string;
  expression: string;
  filter: string;
  analyticsType: string;
  program: { id: string };
  lastUpdatedBy: User;
  sharing: Sharing;
  createdBy: User;
  translations: any[];
  analyticsPeriodBoundaries: AnalyticsPeriodBoundary[];
  attributeValues: any[];
  legendSets: any[];
}

interface User {
  displayName: string;
  name: string;
  id: string;
  username: string;
}

interface Sharing {
  owner?: string;
  userGroups: any;
  external: boolean;
  public?: string;
  users: any;
}

interface AnalyticsPeriodBoundary {
  lastUpdated: string;
  id: string;
  created: string;
  externalAccess: boolean;
  analyticsPeriodBoundaryType: string;
  boundaryTarget: string;
  favorite: boolean;
  access: Access;
  sharing: Sharing;
  favorites: any[];
  translations: any[];
  userGroupAccesses: any[];
  attributeValues: any[];
  userAccesses: any[];
}

interface Access {
  read: boolean;
  update: boolean;
  externalize: boolean;
  write: boolean;
  delete: boolean;
  manage: boolean;
}

interface Option {
  code: string;
  created: string;
  lastUpdated: string;
  name: string;
  id: string;
  sortOrder: number;
  optionSet: { id: string };
  attributeValues: any[];
  translations: any[];
}

const metadataPath = "./metadata.json";
const outputPath = "./indicators.json";

// Function to read metadata file
function readMetadata(path: string): Metadata {
  const rawdata = fs.readFileSync(path, "utf-8");
  return JSON.parse(rawdata) as Metadata;
}

// Function to create indicators
function getOptionsByOptionSetIds(
  metadata: Metadata,
  optionSetIds: string[]
): { diseases: Option[]; statuses: Option[] } {
  const diseases = metadata.options
    .filter(
      (option) =>
        optionSetIds.includes(option.optionSet.id) &&
        option.optionSet.id === optionSetIds[0]
    )
    .filter((option) => diseasesList.includes(option.name));

  const statuses: Option[] = metadata.options
    .filter(
      (option) =>
        optionSetIds.includes(option.optionSet.id) &&
        option.optionSet.id === optionSetIds[1]
    )
    .filter((option) => incidentStatusesList.includes(option.code));
  return { diseases, statuses };
}

// Function to create indicators based on a list of template IDs
function createIndicatorsFromTemplates(
  templateIds: string[],
  metadata: Metadata,
  diseases: Option[],
  statuses: Option[]
): Indicator[] {
  return templateIds.flatMap((templateId) => {
    const templateIndicator = metadata.programIndicators.find(
      (indicator) => indicator.id === templateId
    );
    if (!templateIndicator) {
      throw new Error(`Template indicator with ID ${templateId} not found.`);
    }

    // Handle cases where one of the arrays is empty
    if (diseases.length === 0) {
      return statuses.map((status) => {
        const newIndicator = { ...templateIndicator };
        newIndicator.id = generateId();
        newIndicator.name = `${templateIndicator.name} - ${status.name}`;
        newIndicator.shortName = `${templateIndicator.name} - ${status.code}`;
        newIndicator.filter = `A{${statusTrackedEntityId}}=="${status.code}"`;
        newIndicator.lastUpdated = new Date().toISOString();
        newIndicator.created = newIndicator.lastUpdated;
        newIndicator.analyticsPeriodBoundaries =
          newIndicator.analyticsPeriodBoundaries.map((boundary) => ({
            ...boundary,
            id: generateId(),
            lastUpdated: newIndicator.lastUpdated,
            created: newIndicator.created,
          }));
        return newIndicator;
      });
    } else if (statuses.length === 0) {
      return diseases.map((disease) => {
        const newIndicator = { ...templateIndicator };
        newIndicator.id = generateId();
        newIndicator.name = `${templateIndicator.name} - ${disease.name}`;
        newIndicator.shortName = `${templateIndicator.name} - ${disease.code}`;
        newIndicator.filter = `A{${diseaseTrackedEntityId}}=="${disease.code}"`;
        newIndicator.lastUpdated = new Date().toISOString();
        newIndicator.created = newIndicator.lastUpdated;
        newIndicator.analyticsPeriodBoundaries =
          newIndicator.analyticsPeriodBoundaries.map((boundary) => ({
            ...boundary,
            id: generateId(),
            lastUpdated: newIndicator.lastUpdated,
            created: newIndicator.created,
          }));
        return newIndicator;
      });
    } else {
      return diseases.flatMap((disease) =>
        statuses.map((status) => {
          const newIndicator = { ...templateIndicator };
          newIndicator.id = generateId();
          newIndicator.name = `${templateIndicator.name} - ${disease.name} - ${status.name}`;
          newIndicator.shortName = `${templateIndicator.name} - ${disease.code} - ${status.code}`;
          newIndicator.filter = `A{${statusTrackedEntityId}}=="${status.code}" && A{${diseaseTrackedEntityId}}=="${disease.code}"`; // Adjust attribute IDs as necessary
          newIndicator.lastUpdated = new Date().toISOString();
          newIndicator.created = newIndicator.lastUpdated;
          newIndicator.analyticsPeriodBoundaries =
            newIndicator.analyticsPeriodBoundaries.map((boundary) => ({
              ...boundary,
              id: generateId(),
              lastUpdated: newIndicator.lastUpdated,
              created: newIndicator.created,
            }));
          return newIndicator;
        })
      );
    }
  });
}

// Function to generate a unique ID (placeholder implementation)
function generateId(): string {
  const idx = Number(_.uniqueId());
  return codes[idx];
}

// Main function
function main() {
  const metadata = readMetadata(metadataPath);

  const { diseases, statuses } = getOptionsByOptionSetIds(metadata, [
    diseaseOptionSetId,
    statusOptionSetId,
  ]);

  if (diseases.length === 0 && statuses.length === 0) {
    throw new Error("No options found for the given option set IDs.");
  }

  const indicators = createIndicatorsFromTemplates(
    indicatorIds,
    metadata,
    diseases,
    statuses
  );

  const buildImport = {
    // system: { ...metadata.system },
    programIndicators: indicators,
  };
  console.log("Writing to file: ", outputPath);
  fs.writeFileSync(outputPath, JSON.stringify(buildImport, null, 2));
  console.log("Indicators created successfully! Total: " + indicators.length);
}

main();
