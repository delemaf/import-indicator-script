## Setup

The required node version is v16.14.0. Alternatively, you can run:

To install project:

```console
shell:~$ yarn install
```

## How to run

### Config file
- `uid.json`: DHIS2 uid should be exported with `/api/system/id.json?limit=10000` and added to `uid.json`
- `metadata.json` should exported from DHIS2 Import interface
- `constants.ts` you only have to specify template `indicatorIds` to generate the corresponding indicators
    - You can also specify `diseases` name list and `incidentStatuses` code list, if empty it will only add one filter

The entry point CLI is executed with `yarn start`.

```console
shell:~$ yarn start
```

Result is generated in  `indicators.json` and could be imported in DHIS2 Import interface
