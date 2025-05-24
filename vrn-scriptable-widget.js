let station = args.widgetParameter || "Trier Hauptbahnhof";

station = station
  .replace(" ", "+")
  .replace("ß", "ss")
  .replace("ü", "ue")
  .replace("ä", "ae")
  .replace("ö", "oe");

if (!config.runsInWidget) config.widgetFamily = "large";

const LOCATION_API = `https://ehuebner.dev/api/vrn-trias-location.php?stop=${station}`;
const DEPARTURE_API = (id) => `https://ehuebner.dev/api/vrn-trias-departures.php?id=${id}`;

let locationResult = await new Request(LOCATION_API).loadJSON();
const stationTitle = locationResult[0]?.name || station;
const stationID = locationResult[0]?.id;

if (!stationID) {
  let w = new ListWidget();
  w.addText("Haltestelle nicht gefunden");
  Script.setWidget(w);
  Script.complete();
  return;
}

let depRequest = new Request(DEPARTURE_API(stationID));
let departures = await depRequest.loadJSON();

const widgetSize = config.widgetFamily || "large";
const widget = await createWidget();

if (!config.runInWidget) {
  switch (widgetSize) {
    case "small": await widget.presentSmall(); break;
    case "large": await widget.presentLarge(); break;
    default: await widget.presentMedium();
  }
}

Script.setWidget(widget);
Script.complete();

function createWidget() {
  let count, headerSize, rowHeight, spacing, padding;
  let logoSize, stationSize, timeSize;
  let logoFontSize, stationFontSize, timeFontSize, headlineFontSize;
  let footerHeight, footerFontSize;

  if (widgetSize === "small") {
    count = 4;
    headerSize = 20;
    rowHeight = 15;
    spacing = 4;
    padding = 10;
    logoSize = new Size(22, rowHeight);
    stationSize = new Size(88, rowHeight);
    timeSize = new Size(40, rowHeight);
    logoFontSize = 12;
    stationFontSize = 12;
    timeFontSize = 12;
    headlineFontSize = 16;
    footerHeight = 20;
    footerFontSize = 6;
  } else if (widgetSize === "medium") {
    count = 3;
    headerSize = 25;
    rowHeight = 20;
    spacing = 5;
    padding = spacing;
    logoSize = new Size(35, rowHeight);
    stationSize = new Size(165, rowHeight);
    timeSize = new Size(80, rowHeight);
    logoFontSize = 14;
    stationFontSize = 14;
    timeFontSize = 14;
    headlineFontSize = 20;
    footerHeight = 10;
    footerFontSize = 8;
  } else {
    count = 8;
    headerSize = 30;
    rowHeight = 20;
    spacing = 5;
    padding = spacing;
    logoSize = new Size(35, rowHeight);
    stationSize = new Size(165, rowHeight);
    timeSize = new Size(80, rowHeight);
    logoFontSize = 14;
    stationFontSize = 14;
    timeFontSize = 14;
    headlineFontSize = 24;
    footerHeight = 25;
    footerFontSize = 8;
  }

  const widget = new ListWidget();
  widget.backgroundColor = new Color("#1C1C1E");
  widget.setPadding(padding + 2, padding + 2, padding, padding);

  const mainStack = widget.addStack();
  mainStack.layoutVertically();
  mainStack.centerAlignContent();

  const headerStack = mainStack.addStack();
  headerStack.layoutVertically();
  headerStack.size = new Size(logoSize.width + stationSize.width + timeSize.width + 2 * spacing, headerSize);

  const title = headerStack.addText(stationTitle);
  title.textColor = Color.white();
  title.leftAlignText();
  title.font = Font.boldSystemFont(headlineFontSize);

  mainStack.addSpacer(8);

  for (let i = 0; i < Math.min(count, departures.length); i++) {
    const d = departures[i];
    const rowStack = mainStack.addStack();
    rowStack.spacing = spacing;
    rowStack.size = new Size(logoSize.width + stationSize.width + timeSize.width + 2 * spacing, rowHeight + 2 * spacing);
    rowStack.layoutHorizontally();
    rowStack.centerAlignContent();

    const lineStack = rowStack.addStack();
    lineStack.size = logoSize;
    lineStack.centerAlignContent();
    lineStack.backgroundColor = new Color("#6C4BB7");

    const line = lineStack.addText((d.line || "–").substring(0, 4));
    line.font = Font.boldSystemFont(logoFontSize);
    line.textColor = Color.white();
    line.centerAlignText();
    line.minimumScaleFactor = 0.4;

    const destinationStack = rowStack.addStack();
    destinationStack.size = stationSize;
    destinationStack.layoutVertically();
    destinationStack.bottomAlignContent();

    let maxLen = widgetSize === "large" ? 30 : widgetSize === "medium" ? 26 : 18;
    const destination = destinationStack.addText(truncate(d.direction, maxLen));
    destination.font = Font.lightSystemFont(stationFontSize);
    destination.textColor = Color.white();
    destination.leftAlignText();
    destination.minimumScaleFactor = 0.95;

    const timeStack = rowStack.addStack();
    timeStack.size = timeSize;
    timeStack.bottomAlignContent();

    const planned = new Date(d.planned);
    const estimated = new Date(d.estimated);
    const delay = Math.round((estimated - planned) / 60000);

    const hh = estimated.getHours().toString().padStart(2, '0');
    const mm = estimated.getMinutes().toString().padStart(2, '0');

    const timeText = timeStack.addText(`${hh}:${mm}`);
    timeText.font = Font.boldSystemFont(timeFontSize);
    timeText.rightAlignText();
    timeText.textColor = delay > 1 ? Color.red() : Color.green();
    timeText.minimumScaleFactor = 0.95;

    if (delay > 1 && widgetSize !== "small") {
      const delayLabel = timeStack.addText(` (+${delay})`);
      delayLabel.font = Font.mediumSystemFont(10);
      delayLabel.textColor = Color.red();
      delayLabel.rightAlignText();
    }
  }

  const footerStack = mainStack.addStack();
  footerStack.bottomAlignContent();
  footerStack.size = new Size(logoSize.width + stationSize.width + timeSize.width + 2 * spacing, footerHeight);

  const df = new DateFormatter();
  df.useMediumTimeStyle();
  const lastUpdate = df.string(new Date());

  const footer = footerStack.addText("Letztes Update: " + lastUpdate);
  footer.font = Font.lightSystemFont(footerFontSize);
  footer.textColor = Color.white();
  footer.rightAlignText();
  footer.textOpacity = 0.6;
  footer.minimumScaleFactor = 0.95;

  return widget;
}

function truncate(text, maxLength) {
  return text.length > maxLength ? text.substr(0, maxLength - 3) + '…' : text;
}