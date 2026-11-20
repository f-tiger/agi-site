// One authored workflow per row. The extra input is the named constraint the
// user must supply for this task. Names do not imply manufacturer's tolerances.
const rows = value => value.trim().split('\n').map(line=>line.split('|'));
export const WORKFLOW_PROFILES = {
 row: rows(`
figure-riser-row|Figurines on risers|Figuren auf Erhöhungen|垫高摆件|riserLipReserveMm|Riser lip reserve (mm)|Reserve an der Stufenkante (mm)|垫高台边沿预留（毫米）|24
plush-shelf-row|Plush toys side by side|Stofftiere nebeneinander|并排毛绒玩具|armOverhangReserveMm|Arm overhang reserve (mm)|Reserve für überstehende Arme (mm)|手臂突出预留（毫米）|34
diecast-row|Die-cast cars facing forward|Automodelle von vorn|车头朝前的车模|bumperEndReserveMm|End reserve for bumpers (mm)|Randreserve für Stoßfänger (mm)|保险杠端部预留（毫米）|18
trading-card-stand-row|Trading card display stands|Aufsteller für Sammelkarten|卡牌展示架|labelEndReserveMm|End reserve for price labels (mm)|Randreserve für Preisschilder (mm)|端部价签预留（毫米）|40
pin-board-row|Pin backing tiles|Plättchen für Pins|徽章背板|borderBindingWidthMm|Combined edge binding (mm)|Gesamte Randeinfassung (mm)|边框包边总宽度（毫米）|32
manga-volume-row|Bagged manga volumes|Geschützte Mangabände|袋装漫画册|bookendWidthMm|Combined bookend width (mm)|Gesamtbreite der Buchstützen (mm)|两端书挡总宽度（毫米）|45
postcard-ledger-row|Postcard ledges|Postkartenleisten|明信片展示槽|ledgeStopWidthMm|Combined stop width (mm)|Gesamtbreite der Leistenstopper (mm)|槽口挡块总宽度（毫米）|16
miniature-train-row|Railway miniatures|Modelleisenbahnwagen|铁路模型|trackBufferReserveMm|Track buffer reserve (mm)|Reserve am Gleisabschluss (mm)|轨道端部缓冲预留（毫米）|35
small-pottery-row|Ceramic collection shelf|Regal für Sammlungskeramik|陶瓷收藏架|separationBlockWidthMm|Combined separator width (mm)|Gesamtbreite der Trennelemente (mm)|分隔块总宽度（毫米）|58
blindbox-retail-row|Sealed blind-box row|Reihe geschlossener Blindboxen|未拆盲盒排列|barcodeCardSpaceMm|Space for the barcode card (mm)|Platz für die Barcodekarte (mm)|条码卡预留（毫米）|26
`),
 height: rows(`
dust-cover-height|Dust-cover access|Zugang zur Staubhaube|防尘罩操作|liftToRemoveMm|Vertical lift to remove the cover (mm)|Hub zum Abnehmen der Haube (mm)|取下罩体所需上提量（毫米）|30
stacked-tray-height|Stacked accessory trays|Gestapelte Zubehörschalen|配件托盘叠放|fingerLiftMm|Finger lift above the top tray (mm)|Fingerfreiraum über der obersten Schale (mm)|顶层托盘上方指间净空（毫米）|22
binders-in-drawer-height|Binders in a drawer|Ordner in der Schublade|抽屉中的活页夹|topLabelProtrusionMm|Tab protrusion above the binder (mm)|Überstand der Registerlaschen (mm)|页签突出高度（毫米）|14
drawer-figure-tray-height|Drawer miniature tray|Sortiereinsatz für Miniaturen|微缩模型抽屉托盘|foamRetainerMm|Top foam retainer thickness (mm)|Dicke der oberen Schaumfixierung (mm)|上方固定泡棉厚度（毫米）|9
display-hanger-height|Hanging miniatures and loops|Hängende Miniaturen und Schlaufen|悬挂微缩件与挂环|hookProjectionMm|Hook and loop vertical allowance (mm)|Vertikaler Platz für Haken und Schlaufe (mm)|挂钩挂环纵向预留（毫米）|35
travel-tray-height|Travel case top layer|Obere Lage im Reisekoffer|旅行箱顶层|lidCompressionGapMm|Required uncompressed lid gap (mm)|Erforderlicher ungedrückter Deckelfreiraum (mm)|合盖前不压缩净空（毫米）|20
paper-sleeve-height|Paper sleeves in cabinets|Papierhüllen im Schrank|柜内纸套|thumbLiftMm|Thumb lift for a sleeve (mm)|Griffraum zum Anheben einer Hülle (mm)|取出纸套所需拇指空间（毫米）|17
static-art-frame-height|Framed art on a ledge|Gerahmtes Bild auf einer Leiste|展示槽中的框画|tiltControlGapMm|Extra vertical room for handling (mm)|Zusätzliche Höhe zur Handhabung (mm)|拿取操作所需纵向余量（毫米）|36
model-antenna-height|Models with protruding parts|Modelle mit vorstehenden Teilen|带外伸零件的模型|antennaProjectionMm|Above-body protrusion (mm)|Überstand oberhalb des Körpers (mm)|主体上方突出量（毫米）|29
high-shelf-guard-height|Display beneath a top rail|Ausstellung unter einer oberen Leiste|顶轨下展示|railIntrusionMm|Rail intrusion at the opening (mm)|Überstand der Leiste am Zugang (mm)|顶轨侵入开口高度（毫米）|12
`),
 entry: rows(`
cabinet-door|Small display cabinet aperture|Öffnung der kleinen Vitrine|小展示柜开口|doorHingeReserveMm|Hinge clearance at the opening (mm)|Scharnierfreiraum an der Öffnung (mm)|开口铰链预留（毫米）|10
carry-case-opening|Rigid carry case opening|Öffnung des Hartschalenkoffers|硬壳收纳箱开口|gasketClearanceMm|Gasket clearance (mm)|Freiraum an der Dichtung (mm)|密封条净空（毫米）|7
sleeved-album-slot|Sleeved album slot|Fach für ein Album in Hülle|套袋相册格口|sleeveTabReserveMm|Extra room for sleeve edges (mm)|Zusätzlicher Platz für Hüllenränder (mm)|套袋边缘额外空间（毫米）|8
acrylic-cube-opening|Acrylic display cube|Acryl-Displaywürfel|亚克力展示立方柜|doorTrackReserveMm|Reserve at the door track (mm)|Reserve an der Türführung (mm)|门轨预留（毫米）|6
wide-diorama-entry|Diorama case opening|Öffnung für ein Diorama|场景模型柜开口|terrainDetailReserveMm|Room for exposed scenery (mm)|Platz für freiliegende Szenerie (mm)|场景突出部分预留（毫米）|12
boxed-statue-entry|Boxed statue through an opening|Verpackte Statue durch eine Öffnung|带盒雕像过开口|cornerProtectorReserveMm|Extra handling clearance around corners (mm)|Handhabungsfreiraum an den Ecken (mm)|箱体转角操作净空（毫米）|14
portfolio-cabinet-entry|Rigid portfolio storage|Fach für eine starre Mappe|硬质作品夹入柜|bindingProjectionReserveMm|Binding projection reserve (mm)|Reserve für den Bindungsüberstand (mm)|装订突出量预留（毫米）|4
rail-drawer-tray-entry|Tray through a drawer frame|Einsatz durch den Schubladenrahmen|托盘通过抽屉框|railKeepOutMm|Keep-out for exposed rails (mm)|Freiraum an offenen Führungen (mm)|外露滑轨禁止侵入量（毫米）|15
transport-tote-lid-entry|Crate through a tote lid|Kiste durch die Stapelboxöffnung|箱体穿过收纳箱盖口|lidRibKeepOutMm|Keep-out for lid ribs (mm)|Freiraum an Deckelrippen (mm)|箱盖加强筋预留（毫米）|13
accessory-fit-through-lip|Accessory through a rigid lip|Zubehör durch einen festen Rand|配件通过硬边缘|retainingLipReserveMm|Reserve for the retaining lip (mm)|Reserve an der Haltekante (mm)|限位边缘预留（毫米）|9
`),
 sightline: rows(`
rear-figure-face|A rear figurine’s face|Gesicht der hinteren Figur|后排摆件面部|faceSightMarginMm|Visible gap above foreground (mm)|Sichtbarer Abstand zum Vordergrund (mm)|高于前排的可见净距（毫米）|8
shelf-price-label|Rear shelf price labels|Hintere Preisschilder|后排货架价签|labelReadingMarginMm|Reading clearance (mm)|Lesefreiraum (mm)|辨认价签预留（毫米）|10
model-train-sign|A rear track sign|Schild hinter dem Gleis|后排轨道标牌|signSightMarginMm|Gap over the foreground model (mm)|Abstand zum Vordergrundmodell (mm)|高于前排车模的净距（毫米）|12
diorama-path|A diorama detail at the back|Hinteres Dioramadetail|场景模型后排细节|landscapeSightMarginMm|Visible gap over the terrain (mm)|Sichtabstand zur Landschaftskante (mm)|高于地形边缘的可见间隙（毫米）|16
showcase-logo|A case logo behind objects|Logo hinter Vitrinenobjekten|物件后方的标志|logoReadingMarginMm|Gap to reveal the logo baseline (mm)|Freiraum für die Logo-Grundlinie (mm)|露出标志底线所需间隙（毫米）|5
card-face-detail|A sleeved card’s text line|Textzeile der hinteren Sammelkarte|后排卡牌的文字行|cardTextMarginMm|Gap for the selected text line (mm)|Freiraum für die gewählte Textzeile (mm)|指定文字行可见净距（毫米）|7
plush-tag-reveal|A plush toy’s tag|Etikett eines Stofftiers|毛绒玩具吊牌|tagGapMm|Clearance above the front plush (mm)|Freiraum über dem vorderen Stofftier (mm)|高于前排毛绒的净距（毫米）|19
miniature-race-number|Race numbers on miniature cars|Startnummern auf Modellautos|模型车身编号|numberOffsetMm|Gap for the race number (mm)|Freiraum für die Startnummer (mm)|车身编号可见预留（毫米）|6
cosplay-prop-label|A prop label behind a stand|Schild hinter einer Requisite|支架后方的道具说明卡|propSignMarginMm|Visibility margin for the stand placard (mm)|Sichtreserve für das Aufstellerschild (mm)|说明牌可见净距（毫米）|10
enamel-pin-backing|Enamel pin identifiers|Kennzeichnungen von Emaille-Pins|珐琅徽章编号|pinNumberMarginMm|Gap over the front display row (mm)|Abstand über der vorderen Pin-Reihe (mm)|高于前排徽章的净距（毫米）|9
`),
 load: rows(`
glass-shelf-figures|Figures on a glass shelf|Figuren auf einem Glasboden|玻璃层板上的摆件|matMassG|Protective mat mass (g)|Masse der Schutzunterlage (g)|防护垫质量（克）|140
wood-shelf-books|Books on a wooden shelf|Bücher auf einem Holzboden|木层板上的书册|bookendsMassG|Mass of the bookends (g)|Masse der Buchstützen (g)|书挡质量（克）|340
metal-tray-miniatures|Miniatures on a metal tray|Miniaturen auf einer Metallschale|金属托盘上的微缩模型|separatorMassG|Mass of the divider set (g)|Masse der Trennelemente (g)|隔板组质量（克）|95
display-riser-load|Several items on one riser|Mehrere Objekte auf einer Stufe|一个垫高台上的多件物品|mountMassG|Mass of mounting fixtures (g)|Masse der Befestigungen (g)|固定件质量（克）|70
acrylic-shelf-collectables|Collectables on an acrylic shelf|Sammlerstücke auf einem Acrylboden|亚克力层板上的收藏品|placardMassG|Mass of the signs and labels (g)|Masse der Schilder und Etiketten (g)|标牌与标签质量（克）|120
tote-loading-mass|Items in a carrying tote|Objekte in einer Transportbox|手提收纳箱内的物件|packingMassG|Packing materials mass (g)|Masse des Verpackungsmaterials (g)|包装材料质量（克）|190
drawer-organizer-mass|Items in a drawer insert|Objekte im Schubladeneinsatz|抽屉收纳内衬中的物件|containerMassG|Mass of the insert’s containers (g)|Masse der Einsatzbehälter (g)|内置容器质量（克）|165
display-grid-heavier-items|Heavy items on a grid tray|Schwere Stücke auf einem Rastereinsatz|网格托盘上的重件|anchorHardwareMassG|Mass of anchor hardware (g)|Masse der Befestigungsteile (g)|固定五金质量（克）|110
art-print-table-load|Stored art stacks on a work surface|Kunstdruckstapel auf der Arbeitsfläche|台面上的画作叠放|portfolioMassG|Mass of portfolio covers (g)|Masse der Mappendeckel (g)|画夹封面质量（克）|230
spill-tray-display-load|Tubes on a spill tray|Röhren in einer Auffangschale|防溢托盘上的收藏管|linerMassG|Mass of liners and absorbent pads (g)|Masse von Einlagen und Saugpads (g)|衬垫和吸收材料质量（克）|56
`),
 cartons: rows(`
double-boxed-figure|Double-boxed figures|Doppelt verpackte Figuren|双层纸箱包装摆件|ledgersReservedSlots|Slots for packing records|Plätze für Packbelege|包装记录预留格|1
sealed-card-dispatch|Sealed card slabs|Versiegelte Kartenhüllen|封装评级卡|cornerPadReservedSlots|Slots occupied by corner pads|Durch Eckpolster belegte Plätze|角垫占用格位|2
craft-market-boxes|Craft market stock|Bestand für einen Kunsthandwerksmarkt|手作市集库存|signageReservedSlots|Slots for signs and tags|Plätze für Schilder und Etiketten|标识牌和标签预留格|1
soft-figure-packing|Soft figures in rigid parcels|Stofffiguren im festen Karton|硬箱中的软体摆件|compressionKeepOutSlots|Slots left empty to avoid compression|Freie Plätze gegen Druckstellen|避免压缩的留空格位|3
portfolio-pack-run|Protected portfolios|Geschützte Bildmappen|保护好的作品夹|documentPouchSlots|Slots for documents|Plätze für Begleitunterlagen|随附文件预留格|1
ornament-carton-run|Separately wrapped ornaments|Einzeln verpackte Anhänger|单独包裹的挂件|dividerSlots|Spaces occupied by dividers|Platzbedarf der Trennstege|分隔板占用格位|2
photo-prop-parcels|Photo props packed for transit|Verpackte Fotorequisiten|用于运输的摄影道具|locationLabelSlots|Spaces for location labels|Plätze für Standortkennzeichnungen|位置标签所占格位|1
desktop-box-batch|Desktop organizers batch|Serie von Schreibtischorganisatoren|桌面收纳件批次|toolkitSlots|Slots for the mounting kit|Plätze für Montagesätze|安装配件预留格|1
plush-moving-cartons|Boxed plush for a move|Stofftiere in Umzugskartons|搬运用毛绒玩具纸箱|selectedAccessSlots|Open slots for unpacking access|Offene Plätze für Entnahmezugang|方便拿取的留空格位|4
lidded-drawer-bins-run|Lidded bins grouped for transit|Deckelboxen für den Transport|成组运输的带盖箱|strapSlots|Spaces reserved around straps|Freiräume für Gurte|绑带区域预留格|2
`),
 sheets: rows(`
acid-free-shelf-liners|Shelf liners from sheets|Regaleinlagen aus Bögen|纸质货架衬层|extraShelfLiners|Extra shelf liners for replacements|Zusätzliche Regaleinlagen|备用层板衬纸件数|2
base-label-stock|Base labels|Schildchen für Sockel|底座标签|labelSparePieces|Spare labels|Zusätzliche Schildchen|备用标签数|5
packing-divider-stock|Rectangular packing dividers|Rechteckige Trennstege|矩形打包隔片|dividerSamplePieces|Spare dividers for fitting|Zusätzliche Trennstücke zum Anpassen|用于试装的备用隔片数|3
artwork-backing-board|Artwork backing boards|Rückwände für Bilder|画作背板|practiceBackingBoards|Boards for practice cuts|Rückwände für Probeschnitte|用于试切的备用背板数|2
small-card-mats|Small card mats|Kleine Kartenunterlagen|卡牌小衬垫|extraCardMats|Extra mats|Zusätzliche Unterlagen|备用衬垫数|4
drawer-insert-film|Drawer protection film|Schutzfolie für Schubladen|抽屉防护膜|edgeTestPieces|Pieces for edge fitting|Zuschnitte für Passproben|用于边缘试贴的片数|2
card-archive-tags|Archive tags|Archivschilder|归档标记|extraArchiveTags|Extra archive tags|Zusätzliche Archivschilder|备用归档标记数|3
cloth-separator-stock|Rectangular cloth separators|Rechteckige Stofftrennlagen|矩形布料隔层|extraClothPieces|Extra cloth separators|Zusätzliche Stofftrennlagen|备用布料隔层数|4
display-price-card-stock|Price cards for display|Preiskarten für die Ausstellung|展示用价签卡|blankCardsReserve|Blank cards to reserve|Reserve unbedruckter Karten|留用空白卡数|6
photo-table-insert-stock|Photo table background inserts|Hintergründe für den Fototisch|摄影台背景插片|extraPhotoInserts|Extra background inserts|Zusätzliche Hintergrundeinlagen|备用背景插片数|2
`),
 review: rows(`
shelf-dust-review|Shelf dust inspection|Kontrolle auf Regalstaub|货架积尘检查|dustReviewDays|Your dust check interval in days|Intervall der Staubprüfung in Tagen|自定积尘检查间隔天数|28
condition-photo-review|Condition photo update|Neue Zustandsfotos|品相照片更新|conditionPhotoDays|Your photo review interval in days|Intervall der Fotoprüfung in Tagen|自定照片复查间隔天数|30
storage-label-review|Storage label audit|Prüfung der Lagerbeschriftung|收纳标签检查|labelAuditDays|Your label audit interval in days|Intervall der Etikettenprüfung in Tagen|自定标签检查间隔天数|18
bagged-textile-rotation|Bagged textile review|Prüfung verpackter Textilien|袋装纺织物复查|textileReviewDays|Your textile review interval in days|Intervall der Textilprüfung in Tagen|自定纺织物复查间隔天数|40
archive-snapshot-review|Offline archive snapshot|Offline-Archivkopie|离线档案快照|backupReviewDays|Your backup review interval in days|Intervall der Sicherungsprüfung in Tagen|自定备份复查间隔天数|14
spare-parts-review|Spare parts review|Prüfung der Ersatzteile|备用部件复查|spareAuditDays|Your parts review interval in days|Intervall der Teileprüfung in Tagen|自定零件复查间隔天数|32
reusable-case-seal-review|Case seal inspection|Prüfung der Kofferdichtung|箱体密封检查|sealInspectionDays|Your seal inspection interval in days|Intervall der Dichtungsprüfung in Tagen|自定密封检查间隔天数|22
exhibit-condition-review|Exhibit condition check|Zustandsprüfung für ein Exponat|展品品相核查|exhibitCheckDays|Your exhibit check interval in days|Intervall der Exponatprüfung in Tagen|自定展品复查间隔天数|33
pad-supply-review|Padding supply review|Prüfung des Polsterbestands|缓冲材料库存复查|padSupplyDays|Your padding review interval in days|Intervall der Polsterprüfung in Tagen|自定缓冲材料复查间隔天数|25
loan-file-review|Loan file review|Prüfung der Leihakte|借展档案复查|loanFileDays|Your loan file review interval in days|Intervall für die Leihakte in Tagen|自定借展档案检查间隔天数|21
`),
 stock: rows(`
slot-id-stocktake|Display shelf slots|Stellplätze im Regal|展示架格位|slotDiscrepancyLimit|Tolerated discrepancy per slot|Zulässige Abweichung je Platz|各格位容许差异|0
card-binder-stocktake|Binder card identifiers|Kartenkennzeichen im Ordner|册中卡牌编号|binderLineTolerance|Tolerated variance per card identifier|Zulässige Abweichung je Kartenkennung|每个卡牌编号容许差异|0
loose-accessory-stocktake|Loose model accessories|Loser Modellzubehörbestand|散装模型配件|accessoryTolerance|Tolerated variance per accessory|Zulässige Abweichung je Zubehörteil|每个配件容许差异|1
borrowed-items-stocktake|Items returned from a loan|Rückläufer einer Leihe|归还的借用物件|loanReturnTolerance|Tolerated variance per returned ID|Zulässige Abweichung je Rücklaufkennung|每个归还编号容许差异|0
event-kit-stocktake|Market table stock|Bestand am Marktstand|市集摊位库存|tableIdTolerance|Tolerated variance per table stock ID|Zulässige Abweichung je Standkennung|每个摊位库存编号容许差异|1
archive-sleeve-stocktake|Archived sleeve packs|Vorrat archivierter Hüllen|归档袋库存|sleevePackTolerance|Tolerated variance per sleeve ID|Zulässige Abweichung je Hüllenkennung|每个归档袋编号容许差异|2
relocation-stocktake|Moved boxes|Umgela­gerte Kartons|转移的箱子|movedBoxTolerance|Tolerated variance per box ID|Zulässige Abweichung je Kartonkennung|每个箱子编号容许差异|0
reserve-kit-stocktake|Exhibit reserve kit|Reserve für die Ausstellung|展品备用套件|reservePartTolerance|Tolerated variance per reserve ID|Zulässige Abweichung je Reservekennung|每个备用编号容许差异|1
photo-batch-stocktake|Objects in a photo batch|Objekte eines Fotostapels|一批待拍物件|photoIdTolerance|Tolerated variance per photo object ID|Zulässige Abweichung je Fotoobjektkennung|每个拍摄物件编号容许差异|0
paired-totes-stocktake|Closed storage totes|Geschlossene Lagerboxen|已关闭的收纳箱|closedToteTolerance|Tolerated variance per tote ID|Zulässige Abweichung je Lagerboxkennung|每个收纳箱编号容许差异|0
`),
 depletion: rows(`
sleeve-reserve|Protective sleeves|Schutzhüllen|保护套|sleevesHeldBack|Sleeves reserved for later periods|Hüllenreserve für spätere Läufe|留给后续批次的保护套数|6
corner-reserve|Carton corner protectors|Kartoneckenschoner|纸箱护角|cornersHeldBack|Corner protectors held back|Reserve der Kartoneckenschoner|保留的纸箱护角数|8
labels-reserve|Printed parcel labels|Gedruckte Paketschilder|打印包裹标签|labelsHeldBack|Parcel labels held back|Reserve der Paketschilder|保留的包裹标签数|4
archive-envelopes-reserve|Archive envelopes|Archivumschläge|归档信封|envelopesHeldBack|Archive envelopes held back|Umschlagreserve für das Archiv|保留的归档信封数|5
cloth-wraps-reserve|Reusable cloth wraps|Wiederverwendbare Stoffhüllen|可重用布套|wrapsHeldBack|Reusable wraps held back|Reserve der Stoffhüllen|保留的可重用布套数|7
divider-reserve|Removable dividers|Abnehmbare Trennelemente|可拆隔板|dividersHeldBack|Dividers reserved for later packing|Trennelemente für spätere Packarbeiten|留给后续包装的分隔板数|3
print-barcode-reserve|Barcode tags|Barcodeetiketten|条码标签|barcodeTagsHeldBack|Barcode tags held back|Reserve der Barcodeetiketten|保留的条码标签数|10
mount-tabs-reserve|Display mounting tabs|Montagelaschen für Displays|展示安装片|mountTabsHeldBack|Mounting tabs held back|Reserve der Montagelaschen|保留的安装片数|11
sealed-bags-reserve|Protective poly bags|Schutzbeutel|防护袋|bagsHeldBack|Bags reserved for re-packing|Beutelreserve fürs Umpacken|留给重新包装的防护袋数|10
boxed-gift-wrap-reserve|Packing paper sheets|Packpapierbögen|包装纸张|paperSheetsHeldBack|Paper sheets held back|Reserve der Papierbögen|保留的包装纸张数|12
`),
 index: rows(`
shelf-photo-index|Shelf condition photographs|Zustandsfotos der Regale|货架品相照片|requiredShelfPhotoIds|Required shelf photo IDs, one per line|Pflicht-IDs der Regalfotos, je Zeile eine|必需货架照片编号，每行一个|A010~A012
receipt-folder-index|Purchase receipt folders|Ordner für Kaufbelege|采购凭证文件夹|requiredReceiptIds|Expected receipt references, one per line|Erwartete Belegnummern, je Zeile eine|应有凭证编号，每行一个|A010~A011
incoming-item-index|Incoming object folders|Ordner der Neueingänge|到货物件的文件夹|requiredIntakeIds|Expected intake IDs, one per line|Erwartete Eingangs-IDs, je Zeile eine|应有入库编号，每行一个|A010~A013
serial-closeup-index|Serial number close-ups|Nahaufnahmen der Seriennummern|序列号特写|requiredSerialIds|Object IDs needing serial photographs|Objekt-IDs mit Seriennummernfotos|需要序列号照片的物件编号|A012~A014
manual-index|Product guide folders|Ordner für Produktanleitungen|产品说明书文件夹|requiredManualIds|Models with expected manuals, one per line|Modelle mit erwarteter Anleitung, je Zeile eines|应有说明书的型号，每行一个|A010~A012
loan-archive-index|Loan record archive|Archiv der Leihunterlagen|借展档案|requiredLoanIds|Loan references to reconcile|Abzugleichende Leihreferenzen|需要核对的借展编号|A011~A012
incident-photo-index|Condition-change photos|Fotos von Zustandsänderungen|品相变化照片|requiredInspectionIds|Inspection IDs needing a record|Prüf-IDs mit erforderlichem Nachweis|应留档的检查编号|A010~A014
condition-sheet-index|Pre-sale condition notes|Zustandsnotizen vor dem Verkauf|售前品相记录|requiredConditionIds|Required condition note IDs|IDs der nötigen Zustandsnotizen|必需品相记录编号|A013~A014
qr-reference-index|Shelf code reference records|Referenzen zu Regalcodes|货架代码索引|requiredShelfCodeIds|Required shelf code IDs|IDs der nötigen Regalcodes|必需货架代码编号|A010~A011
transport-paperwork-index|Transport paperwork|Transportunterlagen|运输单据|requiredShipmentIds|Shipment IDs needing an archived record|Sendungs-IDs mit benötigtem Archivbeleg|需留档的货运编号|A011~A015
`),
 units: rows(`
unit-price-display-stands|Display stands|Figurenaufsteller|展示架|offerBBasePlateCents|Offer B base plate adjustment (cents)|Option B, Aufpreis für die Sockelplatte (Cent)|报价 B 底座加价（分）|80
unit-price-corners|Corner protectors|Eckenschoner|纸箱护角|offerBCornerSurchargeCents|Offer B handling surcharge (cents)|Option B, Aufpreis für Bearbeitung (Cent)|报价 B 处理附加费（分）|90
unit-price-storage-crates|Storage crates|Lagerboxen|收纳箱|offerBExtraLidCents|Offer B matching lids (cents)|Option B, passende Deckel (Cent)|报价 B 配套箱盖费用（分）|350
unit-price-binders|Archive binders|Archivordner|归档活页夹|offerBIndexSetCents|Offer B index set (cents)|Option B, Registersatz (Cent)|报价 B 索引套件费用（分）|215
unit-price-card-dividers|Card dividers|Kartentrenner|卡牌隔片|offerBDividerLabelsCents|Offer B divider labels (cents)|Option B, Trennetiketten (Cent)|报价 B 隔片标签费用（分）|110
unit-price-art-envelopes|Art envelopes|Umschläge für Kunstdrucke|画作用信封|offerBCustomSizeCents|Offer B custom size (cents)|Option B, Sonderformat (Cent)|报价 B 定制尺寸费用（分）|160
unit-price-stack-risers|Stackable risers|Stapelbare Erhöhungen|可叠垫高台|offerBProtectivePadsCents|Offer B protective pads (cents)|Option B, Schutzpads (Cent)|报价 B 防护垫费用（分）|245
unit-price-mount-strips|Display mounting strips|Montagestreifen für Displays|展示安装条|offerBSurfacePrepCents|Offer B surface preparation (cents)|Option B, Untergrundvorbereitung (Cent)|报价 B 表面准备费用（分）|180
unit-price-printer-rolls|Label printer rolls|Etikettenrollen|标签打印卷|offerBSupplyAdapterCents|Offer B roll adapter (cents)|Option B, Rollenadapter (Cent)|报价 B 纸卷适配件费用（分）|340
unit-price-photo-backdrops|Photo backdrop tiles|Hintergrundplatten fürs Foto|摄影背景板|offerBMatteFinishCents|Offer B finish adjustment (cents)|Option B, Aufpreis für Oberfläche (Cent)|报价 B 表面处理附加费（分）|220
`),
 landed: rows(`
landed-framed-print|A framed print delivery|Lieferung eines gerahmten Drucks|框画送达成本|glassHandlingFeeCents|Declared handling fee (cents)|Angegebener Bearbeitungsaufpreis (Cent)|已知操作附加费（分）|420
landed-figurine|A collectible figure delivery|Lieferung einer Sammelfigur|收藏摆件送达成本|parcelInsuranceCents|Quoted parcel insurance (cents)|Angebotene Paketversicherung (Cent)|报价中的包裹保险费（分）|250
landed-storage-cart|A storage cart delivery|Lieferung eines Lagerwagens|收纳推车送达成本|floorCarryFeeCents|Quoted floor delivery extra (cents)|Angegebener Aufpreis für Zustellung zur Etage (Cent)|报价中的上楼配送附加费（分）|800
landed-art-tray|Archival trays delivery|Lieferung von Archivschalen|归档托盘送达成本|cornerProtectionFeeCents|Paid corner protection (cents)|Bezahlter Eckenschutz (Cent)|付费护角费用（分）|320
landed-event-stock|Market stock delivery|Lieferung der Marktware|市集备货送达成本|eventReceivingCents|Event receiving charge (cents)|Annahmegebühr am Veranstaltungsort (Cent)|活动现场收货费用（分）|1300
landed-locker-pickup|Pickup from a parcel locker|Abholung am Paketfach|自提柜取件成本|pickupAccessCents|Travel expense for pickup (cents)|Fahrtaufwand zur Abholung (Cent)|取件交通费用（分）|380
landed-archival-sleeves|Document sleeve delivery|Lieferung von Dokumentenhüllen|文件套送达成本|reinforcedPackingCents|Quote for reinforced packing (cents)|Aufpreis für verstärkte Verpackung (Cent)|加固包装报价（分）|140
landed-boxed-resale|Second-hand cabinet accessory|Gebrauchtes Vitrinenzubehör|二手柜体配件到手成本|marketServiceFeeCents|Marketplace service quote (cents)|Angebotene Marketplace-Gebühr (Cent)|平台服务报价费用（分）|360
landed-stationery-order|Stationery order|Bestellung von Schreibwaren|文具订单到手成本|fixedSupplierFeeCents|Supplier order fee (cents)|Bestellgebühr des Lieferanten (Cent)|供应商下单费（分）|180
landed-replacement-pads|Replacement display pads|Ersatzpads für Vitrinen|替换展示垫到手成本|splitConsignmentCents|Extra split shipment cost (cents)|Aufpreis für Teillieferung (Cent)|分开发货额外费用（分）|550
`),
 budget: rows(`
budget-display-shelves|A display shelf purchase|Kauf eines Vitrinenbodens|采购展示层板|mountingBudgetCents|Mounting hardware reserve (cents)|Reserve für Befestigungen (Cent)|安装五金预留（分）|2400
budget-convention-trips|Convention purchases|Einkäufe auf der Messe|展会采购|tripBudgetReserveCents|Travel reserve (cents)|Reisereserve (Cent)|交通预留（分）|4800
budget-sleeves-and-labels|Archive sleeve purchase|Kauf von Archivhüllen|采购归档套|labelReserveCents|Reserve for labeling (cents)|Reserve für Beschriftung (Cent)|标签预留（分）|900
budget-handing-loan|Display loan handoff|Übergabe einer Leihgabe|借展交接成本|returnFreightReserveCents|Return freight reserve (cents)|Reserve für den Rücktransport (Cent)|归还运费预留（分）|3700
budget-collection-offer|An offer on a collection|Angebot für eine Sammlung|对整套藏品报价|unpackingReserveCents|Unpacking supplies reserve (cents)|Reserve fürs Auspacken (Cent)|拆包耗材预留（分）|1100
budget-art-frame|Art framing budget|Budget für Bilderrahmen|装裱预算|artMatReserveCents|Reserve for mats and backings (cents)|Reserve für Passepartout und Rückwand (Cent)|卡纸与背板预留（分）|2300
budget-event-staging|Market display staging|Aufbau am Marktstand|市集展示布置|signageReserveCents|Reserve for signs (cents)|Reserve für Schilder (Cent)|标牌预留（分）|1550
budget-moving-arrivals|Household move supplies|Material für den Umzug|搬运耗材预算|materialsReserveCents|Backup packaging reserve (cents)|Reserve für weiteres Packmaterial (Cent)|备用包装预留（分）|1600
budget-binder-covers|Buying archival binders|Kauf von Archivordnern|采购归档活页夹|insertReserveCents|Reserve for matching inserts (cents)|Reserve für passende Einsätze (Cent)|配套内页预留（分）|1050
budget-photography-accessories|Photo accessories|Fotozubehör|摄影配件预算|lightSupportReserveCents|Light stand reserve (cents)|Reserve für Lichtstative (Cent)|灯架预留（分）|3100
`),
 breakeven: rows(`
break-even-figure-resale|Reselling a collector figure|Weiterverkauf einer Sammelfigur|转售收藏摆件|protectivePackingCents|New protective packing (cents)|Neue Schutzverpackung (Cent)|新增防护包装费用（分）|165
break-even-card-lot|Selling a card lot|Verkauf eines Kartenloses|成批出售卡牌|sortingSupplyCents|Materials used for sorting (cents)|Verbrauchsmaterial zum Sortieren (Cent)|分类耗材费用（分）|380
break-even-used-shelf|Selling a used shelf|Verkauf eines gebrauchten Regals|出售二手货架|bufferDeliveryCents|Your delivery expense (cents)|Eigener Lieferaufwand (Cent)|自身配送开支（分）|1200
break-even-market-set|Selling a set at a market|Verkauf eines Sets am Markt|市集出售套装|allocatedBoothCents|Allocated part of the booth fee (cents)|Zugeordneter Anteil der Standgebühr (Cent)|摊位费分摊（分）|740
break-even-art-print|Selling an art print|Verkauf eines Kunstdrucks|出售画作印刷品|printHandlingCents|Handling and packing supplies (cents)|Verbrauchsmaterial für Handhabung und Packen (Cent)|操作及包装耗材（分）|295
break-even-used-binder|Reselling a binder|Weiterverkauf eines Ordners|转售活页夹|indexReplacementCents|Cost to replace index tabs (cents)|Kosten zum Ersetzen der Register (Cent)|替换索引标签费用（分）|180
break-even-online-tote|Reselling a tote online|Online-Weiterverkauf einer Lagerbox|在线转售收纳箱|sellerCarrierCents|Seller-paid carrier costs (cents)|Vom Verkäufer getragene Fracht (Cent)|卖方承担运费（分）|1010
break-even-consignment-frame|Selling a consigned frame|Verkauf eines Rahmens in Kommission|寄售相框|declaredTransferCostCents|Specified transfer cost (cents)|Angegebene Transferkosten (Cent)|指定转交成本（分）|565
break-even-craft-stock|Selling craft supplies|Verkauf von Kreativmaterial|出售手作材料|orderSortingChargesCents|Declared order preparation charge (cents)|Angegebene Auftragsvorbereitung (Cent)|指定订单备货费用（分）|145
break-even-photo-stand|Selling a used photo stand|Verkauf eines gebrauchten Fotostativs|出售二手摄影支架|anodizedTubeWrapCents|Packing for the tubes (cents)|Verpackung für die Rohre (Cent)|管件包装成本（分）|285
`),
 threshold: rows(`
threshold-archival-sleeves|Archive sleeve shipping|Versand von Archivhüllen|归档套运费|sleevePackCents|Price of a needed sleeve pack (cents)|Preis benötigter Hüllen (Cent)|所需套袋价格（分）|760
threshold-spare-stands|Stand order shipping|Versand von Aufstellern|展示架订单运费|extraStandCents|Price of a needed extra stand (cents)|Preis eines benötigten Zusatzaufstellers (Cent)|所需额外展示架价格（分）|650
threshold-photo-cards|Photo card shipping|Versand von Fotokarten|照片卡订单运费|photoCardPackCents|Price of a needed card pack (cents)|Preis benötigter Fotokarten (Cent)|所需照片卡包装价格（分）|790
threshold-storage-totes|Tote order shipping|Versand von Lagerboxen|收纳箱订单运费|extraToteCents|Price of a needed compatible tote (cents)|Preis einer benötigten passenden Lagerbox (Cent)|所需兼容收纳箱价格（分）|1550
threshold-carton-inserts|Carton insert shopping|Versand von Kartoneinsätzen|箱体内衬订单运费|requiredInsertCents|Price of the needed carton insert (cents)|Preis des benötigten Kartoneinsatzes (Cent)|所需纸箱内衬价格（分）|890
threshold-display-hooks|Display hook shopping|Versand von Ausstellungshaken|展示挂钩订单运费|hookPackCents|Price of necessary hooks (cents)|Preis der benötigten Haken (Cent)|所需挂钩价格（分）|510
threshold-frame-spacers|Frame spacer shipping|Versand von Rahmenabständen|框架间隔块运费|requiredSpacerCents|Price of needed frame spacers (cents)|Preis benötigter Rahmenabstände (Cent)|所需框架间隔件价格（分）|705
threshold-cloth-cover-order|Cloth cover shipping|Versand von Stoffabdeckungen|布罩订单运费|coverOrderTopUpCents|Price of a necessary extra cover (cents)|Preis einer benötigten Zusatzabdeckung (Cent)|所需额外布罩价格（分）|1120
threshold-table-signs|Table sign shipping|Versand von Tischschildern|桌牌订单运费|signTopUpCents|Price of an additional needed sign (cents)|Preis eines benötigten Zusatzschilds (Cent)|所需额外标牌价格（分）|845
threshold-binder-pages|Binder page delivery|Versand von Ordnerhüllen|活页夹内页运费|binderPagesTopUpCents|Price of needed binder pages (cents)|Preis benötigter Ordnerhüllen (Cent)|所需内页价格（分）|930
`),
 quotes: rows(`
quote-storage-space|Storage space plans|Angebote für Lagerfläche|存储空间方案|storageMonths|Months in the storage quote comparison|Monate im Lagerflächenvergleich|存储方案比较期（月）|6
quote-shelf-care|Shelf care costs|Kosten der Regalpflege|货架护理成本|shelfCareMonths|Months of estimated shelf care|Monate geschätzter Regalpflege|货架护理估算期（月）|12
quote-exhibit-display|Display case offers|Vitrinenangebote|展示柜报价|exhibitUseMonths|Months the display is planned|Geplante Ausstellungsmonate|计划使用展示柜月数|8
quote-climate-control|Indoor climate accessories|Raumklimazubehör|室内气候配件|climateUseMonths|Months of expected use|Erwartete Nutzungsmonate|预计使用月数|10
quote-archive-services|Archive storage services|Archivdienste|档案存储服务|archiveMonths|Months of archive service|Monate des Archivdienstes|归档服务月数|16
quote-photo-studio|Photography space quotes|Angebote für einen Fotoarbeitsplatz|摄影空间报价|photoStudioMonths|Months of photo workspace use|Monate der Fotoplatznutzung|摄影空间使用月数|5
quote-event-light|Market lighting quotes|Angebote für Marktbeleuchtung|市集照明报价|standLightMonths|Months of display lighting use|Monate der Beleuchtung am Stand|展示照明使用月数|3
quote-box-label-printer|Label printer quotes|Angebote für Etikettendrucker|标签打印机报价|labelPrintingMonths|Months of planned printing|Monate der geplanten Drucknutzung|计划打印期（月）|15
quote-framing-plan|Print storage options|Aufbewahrung von Kunstdrucken|画作收存方案|printCareMonths|Months of planned print care|Geplante Monate der Druckpflege|计划保存画作月数|18
quote-cabinet-lease|Display cabinet rental options|Miete einer Vitrine|展示柜租用方案|cabinetLeaseMonths|Rental period in months|Mietzeit in Monaten|租期（月）|9
`),
 billing: rows(`
billing-display-carton|A boxed display case|Vitrine im Karton|展示柜包装箱|displayCartonRoundingG|Quoted display parcel increment (g)|Abrechnungsstufe für den Vitrinenkarton (g)|展示箱计费步长（克）|500
billing-loan-return|A loan return parcel|Rücksendung einer Leihgabe|借展退回包裹|loanReturnIncrementG|Quoted loan return increment (g)|Abrechnungsstufe der Leihrücksendung (g)|借展退回计费步长（克）|1000
billing-photobook|A protected photo book|Geschütztes Fotobuch|有保护包装的相册|photobookIncrementG|Quoted photo book increment (g)|Abrechnungsstufe für das Fotobuch (g)|相册计费步长（克）|100
billing-multi-pack-figures|Consolidated figure parcel|Zusammengefasstes Figurenpaket|摆件合并包裹|figureParcelIncrementG|Quoted consolidated parcel increment (g)|Abrechnungsstufe des Sammelpakets (g)|合并包裹计费步长（克）|250
billing-framed-art|Protected framed art|Geschützter gerahmter Druck|有保护包装的框画|framedArtIncrementG|Quoted framed art increment (g)|Abrechnungsstufe für das Rahmenpaket (g)|框画计费步长（克）|1000
billing-flat-poster|A boxed flat print|Flacher Druck im Karton|平放印刷品包装箱|flatPrintIncrementG|Quoted print shipment increment (g)|Abrechnungsstufe für den Druckversand (g)|印刷品运送计费步长（克）|100
billing-accessory-returns|An accessory return|Rücksendung von Zubehör|配件退货|accessoryReturnIncrementG|Quoted accessory return increment (g)|Abrechnungsstufe für Zubehörretouren (g)|配件退货计费步长（克）|250
billing-artifact-kit|A presentation kit|Präsentationssatz im Paket|展示套件|presentationKitIncrementG|Quoted presentation kit increment (g)|Abrechnungsstufe für den Präsentationssatz (g)|展示套件计费步长（克）|500
billing-binders-combined|A parcel of binders|Paket mit Ordnern|活页夹包裹|binderBatchIncrementG|Quoted binder batch increment (g)|Abrechnungsstufe des Ordnerpakets (g)|活页夹包裹计费步长（克）|500
billing-show-stock|Market stock parcel|Paket mit Marktware|市集备货包裹|eventStockIncrementG|Quoted event stock increment (g)|Abrechnungsstufe für den Marktbestand (g)|市集备货计费步长（克）|1000
`),
 scan: rows(`
handoff-lent-art|Loaned prints|Verliehene Kunstdrucke|借展画作|returnedArtworkIds|Arrival IDs for returned prints|Ankunfts-IDs zurückgebrachter Drucke|归还画作到达编号|A001~A002
handoff-exhibit-props|Exhibition props|Ausstellungsrequisiten|展览道具|sitePropArrivalIds|Arrival identifiers at the site|Kennungen am Ausstellungsort|场地到达道具编号|A001
handoff-moving-cartons|Moved cartons|Umzugskartons|搬运纸箱|newHomeCartonIds|Carton IDs at the new address|Karton-IDs am neuen Standort|新址到达纸箱编号|A001~A002~A004
handoff-warehouse-totes|Storage totes|Lagerboxen|收纳箱|warehouseArrivalIds|Totes scanned into storage|Im Lager erfasste Boxen|入库收纳箱扫描编号|A001~A003
handoff-photo-studio|Objects sent to a photo studio|Objekte für ein Fotostudio|送去摄影棚的物件|studioCheckinIds|Studio check-in identifiers|Eingangskennzeichen des Studios|摄影棚签到编号|A002
handoff-fair-stock|Stock transported to a fair|Zur Messe gebrachter Bestand|运往展会的库存|stallArrivalIds|Stock IDs scanned at the stall|Am Stand erfasste Bestandskennungen|摊位到达扫描编号|A001~A002
handoff-archival-binders|Collections moved into archive|Sammlungen im Archiv|移交档案室的藏品|archiveScanIds|Archive arrival identifiers|Zugangskennzeichen des Archivs|档案室到达编号|A001~A001~A002
handoff-tracked-sleeves|Sleeved cards|Sammelkarten in Hüllen|套袋卡牌|sleeveArrivalIds|Sleeve IDs counted at arrival|Bei Ankunft gezählte Hüllen-IDs|到达时盘点的套袋编号|A001~A002
handoff-packaging-station|Packed display items|Verpackte Ausstellungsstücke|已包装展品|dispatchScanIds|Identifiers confirmed at dispatch|Beim Versand bestätigte Kennungen|发件时确认的编号|A002
handoff-pickup-cabinet|Parcels transferred to pickup|Pakete im Abholfach|转到自提点的包裹|pickupReceiptIds|IDs logged at pickup|Bei Abholung protokollierte IDs|自提时登记的编号|A001~A004
`),
 checklist: rows(`
preflight-loan-forms|Loan papers|Leihpapiere|借展单据|requiredLoanForms|Required loan records, one per line|Nötige Leihunterlagen, je Zeile eine|必需借展记录，每行一个|A010~A011
preflight-shelf-labels|Shelf label preparation|Vorbereitung der Regalbeschriftung|货架标签准备|requiredShelfLabels|Required shelf label IDs|IDs der nötigen Regaletiketten|必需货架标签编号|A010~A012
preflight-move-boxes|Move box preparation|Vorbereitung der Umzugskartons|搬运箱准备|requiredBoxReadyIds|Required boxes before loading|Vor dem Laden benötigte Kartons|装车前必需纸箱|A010~A013
preflight-photo-views|Photo view checklist|Liste der Fotoansichten|拍摄视角检查|requiredPhotoViewIds|Required photo view identifiers|IDs der nötigen Fotoansichten|必需拍摄视角编号|A010~A012
preflight-print-wrap|Print wrapping|Verpacken von Kunstdrucken|画作包裹准备|requiredPrintWrapRoles|Required print wrapping steps|Nötige Verpackungsschritte für Drucke|必需画作包裹步骤|A010~A012
preflight-display-stands|Display stand setup|Aufbau der Aufsteller|展示架布置|requiredStandLogIds|Required display stand checks|Nötige Prüfungen der Aufsteller|必需展示架检查项|A010~A011
preflight-table-kit|Fair table kit|Ausrüstung am Messetisch|展台装备|requiredTableKitIds|Required fair table kit IDs|IDs der nötigen Tischausrüstung|必需展台装备编号|A010~A013
preflight-archive-cover|Archive cover checks|Prüfung der Archivabdeckungen|归档护套检查|requiredArchiveCoverIds|Required case cover checks|Nötige Prüfungen der Archivabdeckungen|必需护套检查编号|A010~A012
preflight-riser-placement|Riser arrangement|Anordnung der Erhöhungen|陈列垫高台摆放|requiredRiserSetIds|Required riser positions and IDs|Nötige Positionen und IDs der Erhöhungen|必需的垫高台位置及编号|A011~A012
preflight-shipment-labels|Parcel label preparation|Vorbereitung der Paketetiketten|包裹标签准备|requiredShipmentLabelIds|Required parcel label references|Nötige Referenzen der Paketetiketten|必需包裹标签编号|A010~A012
`),
};
