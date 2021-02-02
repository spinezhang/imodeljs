/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

import { Logger } from "@bentley/bentleyjs-core";
import { CustomQuantityPropEditorSpec, CustomQuantityTypeEntry, IModelApp, UnitSystemKey } from "@bentley/imodeljs-frontend";
import {
  Format, FormatProps, FormatterSpec, Parser, ParseResult, ParserSpec, QuantityStatus, UnitConversionSpec, UnitProps, UnitsProvider,
} from "@bentley/imodeljs-quantity";

export interface BearingFormatProps extends FormatProps {
  readonly custom?: {
    readonly addDirectionLabelGap?: boolean;
    readonly angleDirection?: string;   // "clockwise"|"counter-clockwise"
  };
}

const defaultBearingFormat: BearingFormatProps = {
  composite: {
    includeZero: true,
    spacer: "",
    units: [{ label: "°", name: "Units.ARC_DEG" }, { label: "'", name: "Units.ARC_MINUTE" }, { label: "\"", name: "Units.ARC_SECOND" }],
  },
  formatTraits: ["showUnitLabel"],
  precision: 0,
  type: "Decimal",
  uomSeparator: "",
  custom: {addDirectionLabelGap: true, angleDirection: "clockwise"},
};

class BearingFormatterSpec extends FormatterSpec {
  constructor(name: string, format: Format, conversions: UnitConversionSpec[], persistenceUnit: UnitProps) {
    super(name, format, conversions, persistenceUnit);
  }

  public applyFormatting(magnitude: number): string {
    // quadrant suffixes and prefixes
    const prefix=["N", "S", "S", "N"];
    const suffix=["E", "E", "W", "W"];

    // magnitude is assumed to be Azimuth angle

    // adjust if measuring counter clockwise direction
    if (this.format.customProps?.angleDirection === "counter-clockwise") {
      magnitude = (Math.PI * 2) - magnitude;
    }

    const isNegative = magnitude < 0;
    const positiveRad = Math.abs(magnitude);
    const maxRad = Math.PI*2;

    let adjustedRad = (positiveRad + maxRad)%maxRad;
    if (isNegative)
      adjustedRad = maxRad - adjustedRad;

    let radToFormat = adjustedRad;
    let quadrant = 1;
    if (adjustedRad > Math.PI/2 && adjustedRad <= Math.PI){
      radToFormat = Math.PI - adjustedRad;
      quadrant = 2;
    }else if (adjustedRad > Math.PI && adjustedRad <= (3*Math.PI/2)){
      radToFormat = adjustedRad - Math.PI;
      quadrant = 3;
    } else if (adjustedRad > (3*Math.PI/2) && adjustedRad < (2*Math.PI)) {
      radToFormat = (2*Math.PI)-adjustedRad;
      quadrant = 4;
    }

    const gapChar = (this.format.customProps?.addDirectionLabelGap) ? " " : "";
    const formattedValue = super.applyFormatting(radToFormat);
    return `${prefix[quadrant-1]}${gapChar}${formattedValue}${gapChar}${suffix[quadrant-1]}`;
  }

  /** Static async method to create a FormatSpec given the format and unit of the quantity that will be passed to the Formatter. The input unit will
   * be used to generate conversion information for each unit specified in the Format. This method is async due to the fact that the units provider must make
   * async calls to lookup unit definitions.
   *  @param name     The name of a format specification.
   *  @param unitsProvider The units provider is used to look up unit definitions and provide conversion information for converting between units.
   *  @param persistenceUnit The unit of the value to be formatted.
   */
  public static async create(name: string, format: Format, unitsProvider: UnitsProvider, persistenceUnit: UnitProps): Promise<FormatterSpec> {
    const conversions: UnitConversionSpec[] = await FormatterSpec.getUnitConversions(format,unitsProvider, persistenceUnit);
    return new BearingFormatterSpec(name, format, conversions, persistenceUnit);
  }
}

function bearingGapPropGetter(props: FormatProps) {
  return !!props.custom?.addDirectionLabelGap;
}

function bearingGapPropSetter(props: FormatProps, isChecked: boolean) {
  const customProps = {...props.custom, addDirectionLabelGap:isChecked};
  const newProps = {...props, custom:customProps};
  return newProps;
}

function bearingAngleDirectionGetter(props: FormatProps) {
  return props.custom?.angleDirection??"clockwise";
}

function bearingAngleDirectionSetter(props: FormatProps, value: string) {
  const customProps = {...props.custom, angleDirection:value};
  const newProps = {...props, custom:customProps};
  return newProps;
}

class BearingParserSpec extends ParserSpec {
  constructor(outUnit: UnitProps, format: Format, conversions: UnitConversionSpec[]) {
    super(outUnit, format, conversions);
  }

  public parseToQuantityValue(inString: string): ParseResult {
    let prefix: string|undefined;
    let suffix: string|undefined;
    let adjustedString=inString.toLocaleUpperCase().trimLeft().trimRight();
    if (adjustedString.startsWith("S") || adjustedString.startsWith("N")){
      prefix = adjustedString.slice(0,1);
      adjustedString = adjustedString.substr(1);
    }
    if (adjustedString.endsWith("E") || adjustedString.endsWith("W")){
      suffix = adjustedString.slice(adjustedString.length-1);
      adjustedString = adjustedString.substr(adjustedString.length-1, 1);
    }

    const parsedRadians = Parser.parseToQuantityValue(inString, this.format, this.unitConversions);
    if (parsedRadians.status === QuantityStatus.Success) {
      if (prefix === "N" && suffix === "W") {
        parsedRadians.value = Math.PI - parsedRadians.value!;
      } else if (prefix === "S" && suffix === "W") {
        parsedRadians.value = parsedRadians.value! +  Math.PI;
      } else if (prefix === "N" && suffix === "W") {
        parsedRadians.value = (2*Math.PI)- parsedRadians.value!;
      }
    }

    // adjust if measuring counter clockwise direction
    if (parsedRadians.value && this.format.customProps?.angleDirection === "counter-clockwise") {
      parsedRadians.value = parsedRadians.value - (Math.PI * 2);
    }

    return parsedRadians;
  }

  /** Static async method to create a ParserSpec given the format and unit of the quantity that will be passed to the Parser. The input unit will
   * be used to generate conversion information for each unit specified in the Format. This method is async due to the fact that the units provider must make
   * async calls to lookup unit definitions.
   *  @param format     The format specification.
   *  @param unitsProvider The units provider is used to look up unit definitions and provide conversion information for converting between units.
   *  @param outUnit The unit the value to be formatted. This unit is often referred to as persistence unit.
   */
  public static async create(format: Format, unitsProvider: UnitsProvider, outUnit: UnitProps): Promise<ParserSpec> {
    const conversions = await Parser.createUnitConversionSpecsForUnit(unitsProvider, outUnit);
    return new BearingParserSpec(outUnit, format, conversions);
  }
}

export class BearingQuantityType implements CustomQuantityTypeEntry {
  private  _key = "Bearing";  // key and type should be the same unless a QuatityType enum is specified in _type
  private _type = "Bearing";
  private _persistenceUnitName = "Units.RAD";
  private _persistenceUnit: UnitProps|undefined;
  private _labelKey = "SampleApp:BearingQuantityType.label";
  private _descriptionKey = "SampleApp:BearingQuantityType.description";
  private _label: string|undefined;
  private _description: string|undefined;
  private _formatProps = defaultBearingFormat;

  public get key(): string { return this._key; }
  public get type(): string { return this._type; }

  public get formatProps(): FormatProps { return this._formatProps; }
  public set formatProps(value: FormatProps) { this._formatProps = value; }

  public get persistenceUnit(): UnitProps {
    if (this._persistenceUnit)
      return this._persistenceUnit;
    throw new Error (`_persistenceUnit is not set, did you call BearingQuantityType.registerQuantityType?`);
  }

  public get label(): string {
    if (!this._label) {
      if (this._labelKey)
        this._label = IModelApp.i18n.translate(this._labelKey);
      else
        this._label = this._type;
    }
    return this._label?this._label:"unknown";
  }

  public get description(): string {
    if (!this._description) {
      if (this._descriptionKey)
        this._description = IModelApp.i18n.translate(this._descriptionKey);
      else
        this._description = this.label;
    }

    return this._description?this._description:"unknown";
  }

  public generateFormatterSpec = async (formatProps: FormatProps, unitsProvider: UnitsProvider) => {
    const format = new Format("Bearing");
    await format.fromJSON(unitsProvider, formatProps);
    return BearingFormatterSpec.create(format.name, format, unitsProvider, this.persistenceUnit);
  };

  public generateParserSpec = async (formatProps: FormatProps, unitsProvider: UnitsProvider) => {
    const format = new Format("Bearing");
    await format.fromJSON(unitsProvider, formatProps);
    return BearingParserSpec.create(format, unitsProvider, this.persistenceUnit);
  };

  // Bearing is not unit system specific so no need to check that here
  public getFormatPropsBySystem = (_requestedSystem: UnitSystemKey) => {
    return this.formatProps;
  };

  public get primaryPropEditorSpecs(): CustomQuantityPropEditorSpec[] {
    return [
      {
        editorType: "select",
        selectOptions: [
          {value: "clockwise", label: IModelApp.i18n.translate("SampleApp:BearingQuantityType.bearingAngleDirection.clockwise") },
          {value: "counter-clockwise", label: IModelApp.i18n.translate("SampleApp:BearingQuantityType.bearingAngleDirection.counter-clockwise") },
        ],
        label: IModelApp.i18n.translate("SampleApp:BearingQuantityType.bearingAngleDirection.label"),
        getString: bearingAngleDirectionGetter,
        setString: bearingAngleDirectionSetter,
      },
    ];
  }

  public get secondaryPropEditorSpecs(): CustomQuantityPropEditorSpec[] {
    return [
      {
        editorType: "checkbox",
        label: IModelApp.i18n.translate("SampleApp:BearingQuantityType.bearingGap.label"),
        getBool: bearingGapPropGetter,
        setBool: bearingGapPropSetter,
      },
    ];
  }

  public static async registerQuantityType(initialProps?: FormatProps) {
    const quantityTypeEntry = new BearingQuantityType();
    if (initialProps)
      quantityTypeEntry.formatProps = initialProps;
    quantityTypeEntry._persistenceUnit = await IModelApp.quantityFormatter.findUnitByName(quantityTypeEntry._persistenceUnitName);
    const wasRegistered = await IModelApp.quantityFormatter.registerQuantityType (quantityTypeEntry);
    if (!wasRegistered) {
      Logger.logInfo("BearingQuantityType",
        `Unable to register QuantityType [BearingQuantityType] with key '${quantityTypeEntry.key}'`);
    }
  }
}