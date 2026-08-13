(function() {
  const app = document.getElementById("app");
  const LOCALE_STORAGE_KEY = "commodity-dashboard-locale";
  const APP_DATA_VERSION = "20260812-1";
  const FILTER_HINT_DURATION_MS = 5000;
  const FILTER_HINT_COLLAPSE_MS = 320;
  const MARKET_JUMP_HIGHLIGHT_DURATION_MS = 1800;
  const CARD_TARGET_HIGHLIGHT_DURATION_MS = 2200;
  const SEARCH_INPUT_DEBOUNCE_MS = 350;
  const SEARCH_MIN_QUERY_LENGTH = 3;
  const FUZZY_SEARCH_MIN_TERM_LENGTH = 3;
  const SEARCH_CONNECTIVE_WORDS = new Set([
    "a",
    "an",
    "and",
    "around",
    "at",
    "by",
    "for",
    "from",
    "in",
    "near",
    "of",
    "on",
    "or",
    "the",
    "to",
    "with",
  ]);
  const PRICE_COLORS = {
    max: "#C2410C",
    min: "#1E3A8A",
    modal: "#9A7041",
  };
  const SEARCH_RESULT_TYPE_LABELS = {
    commodity: "Commodity",
    market: "Market",
    variety: "Variety",
  };
  const CATEGORY_ICONS = {
    fruits: "🍎",
    vegetables: "🥕",
    nuts_and_seeds: "🌰",
    grains_and_pulses: "🌾",
    miscellaneous: "🧺",
  };
  CATEGORY_ICONS.spices = "\u{1F336}\uFE0F";
  CATEGORY_ICONS.livestock_and_poultry = "\u{1F404}";

  const COMMODITY_ICONS = {
    Apple: "🍎",
    Banana: "🍌",
    "Banana Green": "🍌",
    Grapes: "🍇",
    Guava: "🍐",
    "Jack Fruit": "🍈",
    Karbuja: "🍈",
    "Lime (Lemon)": "🍋",
    Mango: "🥭",
    "Mango (Raw-Ripe)": "🥭",
    Mousambi: "🍊",
    Orange: "🍊",
    Papaya: "🍈",
    "Pine Apple": "🍍",
    Pomagranate: "🍎",
    "Tamarind Fruit": "🫛",
    "Water Melon": "🍉",
    Onion: "🧅",
    Potato: "🥔",
    Tomato: "🍅",
    Carrot: "🥕",
    Beetroot: "🫜",
    Cabbage: "🥬",
    Cauliflower: "🥦",
    Capsicum: "🫑",
    "Green Chilly": "🌶️",
    "Chilly Red": "🌶️",
    Garlic: "🧄",
    Ginger: "🫚",
    "Sweet Potato": "🍠",
    "Tender Coconut": "🥥",
    "Coconut (Per 1000)": "🥥",
    Copra: "🥥",
    Groundnut: "🥜",
    Cashewnut: "🌰",
    Arecanut: "🌰",
    Pepper: "🫛",
    Paddy: "🌾",
    Rice: "🍚",
    Wheat: "🌾",
    Maize: "🌽",
    Jowar: "🌾",
    Ragi: "🌾",
    Bajra: "🌾",
    Barley: "🌾",
    "Foxtail Millet": "🌾",
    Navane: "🌾",
    "Same/Savi": "🌾",
    Soyabeen: "🫘",
    Greengram: "🫘",
    "Green Gramdal": "🫘",
    Bengalgram: "🫘",
    "Bengal Gramdal": "🫘",
    Blackgram: "🫘",
    "Black Gramdal": "🫘",
    Cowpea: "🫘",
    "Horse Gram": "🫘",
    Redgram: "🫘",
    Tur: "🫘",
    "Tur Dal": "🫘",
  };

  const ASSETS = {
    logo: `./assets/commodity-logo.svg?v=${APP_DATA_VERSION}`,
    heroLogo: `./assets/pv-square-logo.svg?v=${APP_DATA_VERSION}`,
    search: "./assets/search.svg",
    back: "./assets/back.svg",
    filter: "./assets/filter.svg",
    close: "./assets/close.svg",
    heroBg: "./assets/hero-bg.png",
    heroBgMobile: "./assets/hero-bg-mobile.png",
    commodityThumb: "./assets/commodity-thumb.png",
    appleThumb: "./assets/apple-thumb-real.png",
    alasandikaiThumb: "./assets/alasandikai-thumb-real.png",
    alasandeGramThumb: "./assets/alasande-gram-thumb-real.png",
    arecanutThumb: "./assets/arecanut-thumb-real.png",
    ashGourdThumb: "./assets/ash-gourd-thumb-real.png",
    avareThumb: "./assets/avare-thumb-real.png",
    avaredalThumb: "./assets/avaredal-thumb-real.png",
    bananaThumb: "./assets/banana-thumb-real.png",
    bananaGreenThumb: "./assets/banana-green-thumb-real.png",
    bajraThumb: "./assets/bajra-thumb-real.png",
    barleyThumb: "./assets/barley-thumb-real.png",
    bengalGramdalThumb: "./assets/bengal-gramdal-thumb-real.png",
    bengalgramThumb: "./assets/bengalgram-thumb-real.png",
    beansThumb: "./assets/beans-thumb-real.png",
    beetrootThumb: "./assets/beetroot-thumb-real.png",
    betalLeavesThumb: "./assets/betal-leaves-thumb-real.png",
    bitterGourdThumb: "./assets/bitter-gourd-thumb-real.png",
    blackGramdalThumb: "./assets/black-gramdal-thumb-real.png",
    blackgramThumb: "./assets/blackgram-thumb-real.png",
    bottleGourdThumb: "./assets/bottle-gourd-thumb-real.png",
    brinjalThumb: "./assets/brinjal-thumb-real.png",
    bunchBeansThumb: "./assets/bunch-beans-thumb-real.png",
    cabbageThumb: "./assets/cabbage-thumb-real.png",
    cashewnutThumb: "./assets/cashewnut-thumb-real.png",
    capsicumThumb: "./assets/capsicum-thumb-real.png",
    carrotThumb: "./assets/carrot-thumb-real.png",
    castorSeedThumb: "./assets/castor-seed-thumb-real.png",
    cauliflowerThumb: "./assets/cauliflower-thumb-real.png",
    categoryFruitsBadge: "./assets/category-fruits-badge.png",
    categoryVegetablesBadge: "./assets/category-vegetables-badge.png",
    categoryNutsSeedsBadge: "./assets/category-nuts-seeds-badge.png",
    categoryGrainsPulsesBadge: "./assets/category-grains-pulses-badge.png",
    categoryMiscBadge: "./assets/category-misc-badge.png",
    chapparadaAvareThumb: "./assets/chapparada-avare-thumb-real.png",
    chennangidalThumb: "./assets/chennangidal-thumb-real.png",
    chikoosSapotaThumb: "./assets/chikoos-sapota-thumb-real.png",
    chillyCapsicumThumb: "./assets/chilly-capsicum-thumb-real.png",
    chillyRedThumb: "./assets/chilly-red-thumb-real.png",
    coconutPer1000Thumb: "./assets/coconut-per-1000-thumb-real.png",
    copraThumb: "./assets/copra-thumb-real.png",
    corianderThumb: "./assets/coriander-thumb-real.png",
    corianderSeedThumb: "./assets/coriander-seed-thumb-real.png",
    cowpeaThumb: "./assets/cowpea-thumb-real.png",
    cottonSeedThumb: "./assets/cotton-seed-thumb-real.png",
    cumminseedThumb: "./assets/cumminseed-thumb-real.png",
    cucumbarThumb: "./assets/cucumbar-thumb-real.png",
    dusterBeansThumb: "./assets/duster-beans-thumb-real.png",
    drumStickThumb: "./assets/drum-stick-thumb-real.png",
    foxtailMilletThumb: "./assets/foxtail-millet-thumb-real.png",
    garlicThumb: "./assets/garlic-thumb-real.png",
    gingerThumb: "./assets/ginger-thumb-real.png",
    gingellyThumb: "./assets/gingelly-thumb-real.png",
    grapesThumb: "./assets/grapes-thumb-real.png",
    greenAvareWThumb: "./assets/green-avare-w-thumb-real.png",
    greenChillyThumb: "./assets/green-chilly-thumb-real.png",
    greenGingerThumb: "./assets/green-ginger-thumb-real.png",
    greenGramdalThumb: "./assets/green-gramdal-thumb-real.png",
    greenPeasThumb: "./assets/green-peas-thumb-real.png",
    greengramThumb: "./assets/greengram-thumb-real.png",
    groundnutThumb: "./assets/groundnut-thumb-real.png",
    groundnutSeedThumb: "./assets/groundnut-seed-thumb-real.png",
    gurelluThumb: "./assets/gurellu-thumb-real.png",
    guavaThumb: "./assets/guava-thumb-real.png",
    hongeSeedThumb: "./assets/honge-seed-thumb-real.png",
    horseGramThumb: "./assets/horse-gram-thumb-real.png",
    jackFruitThumb: "./assets/jack-fruit-thumb-real.png",
    jowarThumb: "./assets/jowar-thumb-real.png",
    karbujaThumb: "./assets/karbuja-thumb-real.png",
    knoolKholThumb: "./assets/knool-khol-thumb-real.png",
    ladiesFingerThumb: "./assets/ladies-finger-thumb-real.png",
    limeLemonThumb: "./assets/lime-lemon-thumb-real.png",
    mangoThumb: "./assets/mango-thumb-real.png",
    mangoRawRipeThumb: "./assets/mango-raw-ripe-thumb-real.png",
    maizeThumb: "./assets/maize-thumb-real.png",
    marketThumb: "./assets/market-thumb.png",
    matakiThumb: "./assets/mataki-thumb-real.png",
    methiSeedsThumb: "./assets/methi-seeds-thumb-real.png",
    moathThumb: "./assets/moath-thumb-real.png",
    mousambiThumb: "./assets/mousambi-thumb-real.png",
    mustardThumb: "./assets/mustard-thumb-real.png",
    navaneThumb: "./assets/navane-thumb-real.png",
    neemSeedThumb: "./assets/neem-seed-thumb-real.png",
    nigerSeedThumb: "./assets/niger-seed-thumb-real.png",
    onionThumb: "./assets/onion-thumb-real.png",
    orangeThumb: "./assets/orange-thumb-real.png",
    paddyThumb: "./assets/paddy-thumb-real.png",
    papayaThumb: "./assets/papaya-thumb-real.png",
    peasWetThumb: "./assets/peas-wet-thumb-real.png",
    pineAppleThumb: "./assets/pine-apple-thumb-real.png",
    pomagranateThumb: "./assets/pomagranate-thumb-real.png",
    potatoThumb: "./assets/potato-thumb-real.png",
    raddishThumb: "./assets/raddish-thumb-real.png",
    ragiThumb: "./assets/ragi-thumb-real.png",
    redgramThumb: "./assets/redgram-thumb-real.png",
    ridgeguardThumb: "./assets/ridgeguard-thumb-real.png",
    riceThumb: "./assets/rice-thumb-real.png",
    safflowerThumb: "./assets/safflower-thumb-real.png",
    sameSaviThumb: "./assets/same-savi-thumb-real.png",
    seemebadanekaiThumb: "./assets/seemebadanekai-thumb-real.png",
    sesamumThumb: "./assets/sesamum-thumb-real.png",
    snakeguardThumb: "./assets/snakeguard-thumb-real.png",
    soyabeenThumb: "./assets/soyabeen-thumb-real.png",
    sunflowerThumb: "./assets/sunflower-thumb-real.png",
    suvarnagaddeThumb: "./assets/suvarnagadde-thumb-real.png",
    sweetPotatoThumb: "./assets/sweet-potato-thumb-real.png",
    sweetPumpkinThumb: "./assets/sweet-pumpkin-thumb-real.png",
    tamarindFruitThumb: "./assets/tamarind-fruit-thumb-real.png",
    tamarindSeedThumb: "./assets/tamarind-seed-thumb-real.png",
    tenderCoconutThumb: "./assets/tender-coconut-thumb-real.png",
    thogarikaiThumb: "./assets/thogarikai-thumb-real.png",
    thondekaiThumb: "./assets/thondekai-thumb-real.png",
    tomatoThumb: "./assets/tomato-thumb-real.png",
    turThumb: "./assets/tur-thumb-real.png",
    turDalThumb: "./assets/tur-dal-thumb-real.png",
    waterMelonThumb: "./assets/water-melon-thumb-real.png",
    wheatThumb: "./assets/wheat-thumb-real.png",
    whitePumpkinThumb: "./assets/white-pumpkin-thumb-real.png",
    allFlowersThumb: "./assets/all-flowers-thumb-real.png",
    antawalaThumb: "./assets/antawala-thumb-real.png",
    bullForEachThumb: "./assets/bull-for-each-thumb-real.png",
    bullarThumb: "./assets/bullar-thumb-real.png",
    calfForEachThumb: "./assets/calf-for-each-thumb-real.png",
    cloveThumb: "./assets/clove-thumb-real.png",
    cocoBroomsThumb: "./assets/coco-brooms-thumb-real.png",
    coffeeThumb: "./assets/coffee-thumb-real.png",
    cottonThumb: "./assets/cotton-thumb-real.png",
    cowForEachThumb: "./assets/cow-for-each-thumb-real.png",
    crysanthamumThumb: "./assets/crysanthamum-thumb-real.png",
    dryChilliesThumb: "./assets/dry-chillies-thumb-real.png",
    dryGrapesThumb: "./assets/dry-grapes-thumb-real.png",
    goatForEachThumb: "./assets/goat-for-each-thumb-real.png",
    heBaffaloForEachThumb: "./assets/he-baffalo-for-each-thumb-real.png",
    jaggeryThumb: "./assets/jaggery-thumb-real.png",
    lintThumb: "./assets/lint-thumb-real.png",
    maceThumb: "./assets/mace-thumb-real.png",
    marygoldThumb: "./assets/marygold-thumb-real.png",
    nutmegThumb: "./assets/nutmeg-thumb-real.png",
    oxForEachThumb: "./assets/ox-for-each-thumb-real.png",
    pepperThumb: "./assets/pepper-thumb-real.png",
    ramForEachThumb: "./assets/ram-for-each-thumb-real.png",
    roseThumb: "./assets/rose-thumb-real.png",
    rubberThumb: "./assets/rubber-thumb-real.png",
    sajjeThumb: "./assets/sajje-thumb-real.png",
    sheBaffaloForEachThumb: "./assets/she-baffalo-for-each-thumb-real.png",
    sheGoatForEachThumb: "./assets/she-goat-for-each-thumb-real.png",
    sheepForEachThumb: "./assets/sheep-for-each-thumb-real.png",
    silkThumb: "./assets/silk-thumb-real.png",
    soapnutThumb: "./assets/soapnut-thumb-real.png",
    turmericThumb: "./assets/turmeric-thumb-real.png",
    categoryThumb: "./assets/category.png",
    emptyState: "./assets/empty-state.svg",
    suggestionCommodity: "./assets/suggestion-commodity.svg",
    suggestionMarket: "./assets/suggestion-market.svg?v=2",
    suggestionVariety: "./assets/suggestion-variety.svg",
  };

  ASSETS.categorySpicesBadge = "./assets/category-spices-badge.png";
  ASSETS.categoryLivestockPoultryBadge = "./assets/category-livestock-poultry-badge.png";
  ASSETS.eggThumb = "./assets/egg-thumb-real.png";

  const CATEGORY_TAB_THUMBS = {
    fruits: ASSETS.categoryFruitsBadge,
    vegetables: ASSETS.categoryVegetablesBadge,
    nuts_and_seeds: ASSETS.categoryNutsSeedsBadge,
    grains_and_pulses: ASSETS.categoryGrainsPulsesBadge,
    miscellaneous: ASSETS.categoryMiscBadge,
  };

  CATEGORY_TAB_THUMBS.spices = ASSETS.categorySpicesBadge;
  CATEGORY_TAB_THUMBS.livestock_and_poultry = ASSETS.categoryLivestockPoultryBadge;

  const BAKED_COMMODITY_THUMBS = {
    Apple: ASSETS.appleThumb,
    Alasandikai: ASSETS.alasandikaiThumb,
    Arecanut: ASSETS.arecanutThumb,
    "Ash Gourd": ASSETS.ashGourdThumb,
    Avare: ASSETS.avareThumb,
    Banana: ASSETS.bananaThumb,
    "Banana Green": ASSETS.bananaGreenThumb,
    Beans: ASSETS.beansThumb,
    Beetroot: ASSETS.beetrootThumb,
    "Betal Leaves": ASSETS.betalLeavesThumb,
    "Bitter Gourd": ASSETS.bitterGourdThumb,
    "Bottle Gourd": ASSETS.bottleGourdThumb,
    Brinjal: ASSETS.brinjalThumb,
    "Bunch Beans": ASSETS.bunchBeansThumb,
    Cabbage: ASSETS.cabbageThumb,
    Cashewnut: ASSETS.cashewnutThumb,
    Capsicum: ASSETS.capsicumThumb,
    Carrot: ASSETS.carrotThumb,
    "Castor Seed": ASSETS.castorSeedThumb,
    Cauliflower: ASSETS.cauliflowerThumb,
    "Chapparada Avare": ASSETS.chapparadaAvareThumb,
    "Chikoos (Sapota)": ASSETS.chikoosSapotaThumb,
    "Chilly Capsicum": ASSETS.chillyCapsicumThumb,
    "Chilly Red": ASSETS.chillyRedThumb,
    "Coconut (Per 1000)": ASSETS.coconutPer1000Thumb,
    Copra: ASSETS.copraThumb,
    Coriander: ASSETS.corianderThumb,
    "Coriander Seed": ASSETS.corianderSeedThumb,
    "Cotton Seed": ASSETS.cottonSeedThumb,
    Cumminseed: ASSETS.cumminseedThumb,
    Cucumbar: ASSETS.cucumbarThumb,
    "Drum Stick": ASSETS.drumStickThumb,
    Garlic: ASSETS.garlicThumb,
    Ginger: ASSETS.gingerThumb,
    Gingelly: ASSETS.gingellyThumb,
    Grapes: ASSETS.grapesThumb,
    "Green Avare (W)": ASSETS.greenAvareWThumb,
    "Green Chilly": ASSETS.greenChillyThumb,
    "Green Ginger": ASSETS.greenGingerThumb,
    "Green Peas": ASSETS.greenPeasThumb,
    Groundnut: ASSETS.groundnutThumb,
    "Groundnut Seed": ASSETS.groundnutSeedThumb,
    Gurellu: ASSETS.gurelluThumb,
    Guava: ASSETS.guavaThumb,
    "Honge Seed": ASSETS.hongeSeedThumb,
    "Jack Fruit": ASSETS.jackFruitThumb,
    Karbuja: ASSETS.karbujaThumb,
    "Knool Khol": ASSETS.knoolKholThumb,
    "Ladies Finger": ASSETS.ladiesFingerThumb,
    "Lime (Lemon)": ASSETS.limeLemonThumb,
    Mango: ASSETS.mangoThumb,
    "Mango (Raw-Ripe)": ASSETS.mangoRawRipeThumb,
    Mousambi: ASSETS.mousambiThumb,
    "Methi Seeds": ASSETS.methiSeedsThumb,
    Mustard: ASSETS.mustardThumb,
    "Neem Seed": ASSETS.neemSeedThumb,
    "Niger Seed": ASSETS.nigerSeedThumb,
    Onion: ASSETS.onionThumb,
    Orange: ASSETS.orangeThumb,
    Papaya: ASSETS.papayaThumb,
    "Peas Wet": ASSETS.peasWetThumb,
    "Pine Apple": ASSETS.pineAppleThumb,
    Pomagranate: ASSETS.pomagranateThumb,
    Potato: ASSETS.potatoThumb,
    Raddish: ASSETS.raddishThumb,
    Ridgeguard: ASSETS.ridgeguardThumb,
    Safflower: ASSETS.safflowerThumb,
    Seemebadanekai: ASSETS.seemebadanekaiThumb,
    Sesamum: ASSETS.sesamumThumb,
    Snakeguard: ASSETS.snakeguardThumb,
    Sunflower: ASSETS.sunflowerThumb,
    Suvarnagadde: ASSETS.suvarnagaddeThumb,
    "Sweet Potato": ASSETS.sweetPotatoThumb,
    "Sweet Pumpkin": ASSETS.sweetPumpkinThumb,
    "Tamarind Fruit": ASSETS.tamarindFruitThumb,
    "Tamarind Seed": ASSETS.tamarindSeedThumb,
    "Tender Coconut": ASSETS.tenderCoconutThumb,
    Thogarikai: ASSETS.thogarikaiThumb,
    Thondekai: ASSETS.thondekaiThumb,
    Tomato: ASSETS.tomatoThumb,
    "Alasande Gram": ASSETS.alasandeGramThumb,
    Avaredal: ASSETS.avaredalThumb,
    Bajra: ASSETS.bajraThumb,
    Barley: ASSETS.barleyThumb,
    "Bengal Gramdal": ASSETS.bengalGramdalThumb,
    Bengalgram: ASSETS.bengalgramThumb,
    "Black Gramdal": ASSETS.blackGramdalThumb,
    Blackgram: ASSETS.blackgramThumb,
    Chennangidal: ASSETS.chennangidalThumb,
    Cowpea: ASSETS.cowpeaThumb,
    "Duster Beans": ASSETS.dusterBeansThumb,
    "Foxtail Millet": ASSETS.foxtailMilletThumb,
    "Green Gramdal": ASSETS.greenGramdalThumb,
    Greengram: ASSETS.greengramThumb,
    "Horse Gram": ASSETS.horseGramThumb,
    Jowar: ASSETS.jowarThumb,
    Maize: ASSETS.maizeThumb,
    Mataki: ASSETS.matakiThumb,
    Moath: ASSETS.moathThumb,
    Navane: ASSETS.navaneThumb,
    Paddy: ASSETS.paddyThumb,
    Ragi: ASSETS.ragiThumb,
    Redgram: ASSETS.redgramThumb,
    Rice: ASSETS.riceThumb,
    "Same/Savi": ASSETS.sameSaviThumb,
    Soyabeen: ASSETS.soyabeenThumb,
    Tur: ASSETS.turThumb,
    "Tur Dal": ASSETS.turDalThumb,
    "Water Melon": ASSETS.waterMelonThumb,
    Wheat: ASSETS.wheatThumb,
    "White Pumpkin": ASSETS.whitePumpkinThumb,
    "All Flowers": ASSETS.allFlowersThumb,
    Antawala: ASSETS.antawalaThumb,
    "Bull (For Each)": ASSETS.bullForEachThumb,
    Bullar: ASSETS.bullarThumb,
    "Calf (For Each)": ASSETS.calfForEachThumb,
    Clove: ASSETS.cloveThumb,
    "Coco Brooms": ASSETS.cocoBroomsThumb,
    Coffee: ASSETS.coffeeThumb,
    Cotton: ASSETS.cottonThumb,
    "Cow (For Each)": ASSETS.cowForEachThumb,
    Crysanthamum: ASSETS.crysanthamumThumb,
    "Dry Chillies": ASSETS.dryChilliesThumb,
    "Dry Grapes": ASSETS.dryGrapesThumb,
    "Goat (For Each)": ASSETS.goatForEachThumb,
    "He Baffalo (For Each)": ASSETS.heBaffaloForEachThumb,
    Jaggery: ASSETS.jaggeryThumb,
    Lint: ASSETS.lintThumb,
    Mace: ASSETS.maceThumb,
    Marygold: ASSETS.marygoldThumb,
    Nutmeg: ASSETS.nutmegThumb,
    "Ox (For Each)": ASSETS.oxForEachThumb,
    Pepper: ASSETS.pepperThumb,
    "Ram (For Each)": ASSETS.ramForEachThumb,
    Rose: ASSETS.roseThumb,
    Rubber: ASSETS.rubberThumb,
    Sajje: ASSETS.sajjeThumb,
    "She Baffalo (For Each)": ASSETS.sheBaffaloForEachThumb,
    "She Goat (For Each)": ASSETS.sheGoatForEachThumb,
    "Sheep (For Each)": ASSETS.sheepForEachThumb,
    Silk: ASSETS.silkThumb,
    Soapnut: ASSETS.soapnutThumb,
    Turmeric: ASSETS.turmericThumb,
  };

  BAKED_COMMODITY_THUMBS.Egg = ASSETS.eggThumb;
  COMMODITY_ICONS.Egg = "\u{1F95A}";

  const initialRoute = parseRoute();
  const state = {
    route: initialRoute,
    query: "",
    suggestions: [],
    context: null,
    allRows: [],
    baseRows: [],
    filters: {},
    filterDrafts: {},
    filterSearches: {},
    pendingFilterSelection: null,
    activeFilterField: "",
    isFilterModalOpen: false,
    isMarketJumpOpen: false,
    isSearchOpen: false,
    searchUiState: "idle",
    searchIndexStatus: "loading",
    isTopbarVisible: true,
    showHomeTopbarSearch: false,
    showFilterHint: false,
    shouldScrollTableIntoView: false,
    shouldPrimeExpandedHistory: false,
    activeChartDate: null,
    expandedRowKey: null,
    searchToken: 0,
    locale: getStoredLocale(),
    translations: {
      ui: {},
      commodities: {},
      markets: {},
      varieties: {},
    },
    searchIndex: {
      commodities: [],
      markets: [],
      varieties: [],
    },
    searchAliases: {
      commodities: {},
      varieties: {},
    },
    searchTransliterations: {
      commodities: {},
      varieties: {},
    },
    categoryGroups: [],
    activeHomeCategoryId: "",
    shouldRevealActiveHomeCategory: false,
    cachedVisibleRowsKey: "",
    cachedVisibleRows: [],
    cachedFilterOptions: {},
    cachedMarketCommodityLookup: null,
    cachedSearchCandidates: null,
    cardTargetAppliedKey: "",
    shareFeedback: null,
  };

  let filterHintTimer = null;
  let filterHintFinalizeTimer = null;
  let searchInputTimer = null;
  let renderFrameId = null;
  let stickyTableHeaderCleanup = null;
  let backToTopButtonCleanup = null;
  let homeTopbarSearchCleanup = null;
  let topbarVisibilityCleanup = null;
  let lockedBodyScrollY = null;
  let marketJumpHighlightTimer = null;
  let cardTargetHighlightTimer = null;
  let shareFeedbackTimer = null;

  document.addEventListener("click", handleDocumentClick);
  window.addEventListener("popstate", handlePopState);
  setupVisualViewportTracking();

  boot();

  async function boot() {
    if (state.route.view === "table") {
      primeTableArrivalUi();
    }

    render();

    await Promise.all([
      loadTranslations(),
      loadSearchIndex(),
      loadSearchAliases(),
      loadSearchTransliterations(),
      loadCategoryGroups(),
      loadObservations(),
    ]);

    if (state.route.view === "table") {
      loadContext();
      return;
    }

    render();
  }

  async function loadTranslations() {
    try {
      const payload = await fetchJson(`./translations.json?v=${APP_DATA_VERSION}`);
      state.translations = {
        ui: payload.ui || {},
        commodities: payload.commodities || {},
        markets: payload.markets || {},
        varieties: payload.varieties || {},
      };
      invalidateDerivedDataCaches();
      syncSearchResultsForQuery(state.query);
      if (state.isSearchOpen) {
        syncSearchSuggestionsUi();
      }
    } catch (error) {
      state.translations = {
        ui: {},
        commodities: {},
        markets: {},
        varieties: {},
      };
    }

  }

  async function loadSearchIndex() {
    try {
      const payload = await fetchJson(`./data/search-index.json?v=${APP_DATA_VERSION}`);
      state.searchIndex = {
        commodities: payload.commodities || [],
        markets: payload.markets || [],
        varieties: payload.varieties || [],
      };
      state.cachedSearchCandidates = null;
      state.searchIndexStatus = "ready";
    } catch (error) {
      state.searchIndex = {
        commodities: [],
        markets: [],
        varieties: [],
      };
      state.searchIndexStatus = "error";
    }

    syncSearchResultsForQuery(state.query);
    if (state.isSearchOpen) {
      syncSearchSuggestionsUi();
    }
  }

  async function loadCategoryGroups() {
    try {
      const payload = await fetchJson(`./data/categories.json?v=${APP_DATA_VERSION}`);
      state.categoryGroups = Array.isArray(payload.categories) ? payload.categories : [];
    } catch (error) {
      state.categoryGroups = [];
    }

    if (!state.categoryGroups.length) {
      state.activeHomeCategoryId = "";
      return;
    }

    const hasActiveCategory = state.categoryGroups.some((category) => category.id === state.activeHomeCategoryId);
    if (!hasActiveCategory) {
      state.activeHomeCategoryId = state.categoryGroups[0].id;
    }
  }

  async function loadObservations() {
    try {
      const rows = await fetchJson(`./data/observations.json?v=${APP_DATA_VERSION}`);
      state.allRows = Array.isArray(rows) ? rows.map(normalizeObservationRow) : [];
    } catch (error) {
      state.allRows = [];
    }

    invalidateDerivedDataCaches();
  }

  function normalizeResultsLayout(layout) {
    return layout === "table" ? "table" : "cards";
  }

  function getDefaultResultsLayout() {
    return isCompactViewport() ? "cards" : "table";
  }

  function parseRoute() {
    const params = new URLSearchParams(window.location.search);
    const view = params.get("view") === "table" ? "table" : "home";
    const layoutParam = params.get("layout");
    return {
      view,
      layout: view === "table"
        ? normalizeResultsLayout(layoutParam || getDefaultResultsLayout())
        : "cards",
      type: params.get("type") || "",
      commodity: params.get("commodity") || "",
      market: params.get("market") || "",
      variety: params.get("variety") || "",
      origin: params.get("origin") || "",
      card: params.get("card") || "",
    };
  }

  function buildRouteUrl(route) {
    const params = new URLSearchParams();
    if (route.view === "table") {
      params.set("view", "table");
      params.set("layout", normalizeResultsLayout(route.layout));
      params.set("type", route.type);
      if (route.commodity) {
        params.set("commodity", route.commodity);
      }
      if (route.market) {
        params.set("market", route.market);
      }
      if (route.variety) {
        params.set("variety", route.variety);
      }
      if (route.origin) {
        params.set("origin", route.origin);
      }
      if (route.card) {
        params.set("card", route.card);
      }
    }
    const query = params.toString();
    const basePath = (window.location.origin || "") + (window.location.pathname || "./");
    return query ? `${basePath}?${query}` : basePath;
  }

  function navigate(route) {
    const nextUrl = buildRouteUrl(route);
    window.history.pushState({}, "", nextUrl);
    state.route = route;
    state.context = null;
    state.baseRows = [];
    state.filters = {};
    state.filterDrafts = {};
    state.filterSearches = {};
    state.pendingFilterSelection = null;
    state.activeFilterField = "";
    state.isFilterModalOpen = false;
    state.isMarketJumpOpen = false;
    state.isSearchOpen = false;
    state.showFilterHint = false;
    state.shouldScrollTableIntoView = false;
    state.shouldPrimeExpandedHistory = false;
    state.activeChartDate = null;
    state.expandedRowKey = null;
    state.cardTargetAppliedKey = "";
    state.suggestions = [];
    invalidateDerivedDataCaches();
    if (route.view === "table") {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      primeTableArrivalUi();
    } else {
      clearFilterHintTimers();
    }

    scheduleRender();
    if (route.view === "table") {
      loadContext();
    }
  }

  function handlePopState() {
    state.route = parseRoute();
    state.context = null;
    state.baseRows = [];
    state.filters = {};
    state.filterDrafts = {};
    state.filterSearches = {};
    state.pendingFilterSelection = null;
    state.activeFilterField = "";
    state.isFilterModalOpen = false;
    state.isMarketJumpOpen = false;
    state.isSearchOpen = false;
    state.showFilterHint = false;
    state.shouldScrollTableIntoView = false;
    state.shouldPrimeExpandedHistory = false;
    state.activeChartDate = null;
    state.expandedRowKey = null;
    state.cardTargetAppliedKey = "";
    state.suggestions = [];
    invalidateDerivedDataCaches();
    if (state.route.view === "table") {
      primeTableArrivalUi();
    } else {
      clearFilterHintTimers();
    }

    scheduleRender();
    if (state.route.view === "table") {
      loadContext();
    }
  }

  async function fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }
    return response.json();
  }

  async function search(query) {
    if (query !== state.query) {
      return;
    }

    const token = ++state.searchToken;
    syncSearchResultsForQuery(query);
    if (token !== state.searchToken) {
      return;
    }
    syncSearchSuggestionsUi();
  }

  async function loadContext() {
    const route = state.route;

    try {
      const derived = deriveContext(route);
      state.context = derived.context;
      state.baseRows = derived.rows;
      state.filters = buildInitialFilters(derived.context.filters);
      state.filterDrafts = cloneFilters(state.filters);
      state.filterSearches = buildInitialFilterSearches(derived.context.filters);
      state.pendingFilterSelection = null;
      state.activeFilterField = "";
      state.isFilterModalOpen = false;
      state.isMarketJumpOpen = false;
      state.activeChartDate = null;
      state.expandedRowKey = null;
      invalidateDerivedDataCaches();
    } catch (error) {
      state.context = {
        heading: "Unavailable",
        locked: {},
        filters: [],
      };
      state.baseRows = [];
      state.filters = {};
      state.filterDrafts = {};
      state.filterSearches = {};
      state.pendingFilterSelection = null;
      state.activeFilterField = "";
      state.isFilterModalOpen = false;
      state.isMarketJumpOpen = false;
      state.activeChartDate = null;
      invalidateDerivedDataCaches();
    }
    scheduleRender();
  }

  function buildInitialFilters(filterNames) {
    const next = {};
    filterNames.forEach((name) => {
      next[name] = [];
    });
    return next;
  }

  function buildInitialFilterSearches(filterNames) {
    const next = {};
    filterNames.forEach((name) => {
      next[name] = "";
    });
    return next;
  }

  function cloneFilters(filters) {
    const next = {};
    Object.entries(filters).forEach(([key, values]) => {
      next[key] = [...values];
    });
    return next;
  }

  function deriveContext(route) {
    if (!state.allRows.length) {
      throw new Error("Observation data not loaded.");
    }

    if (route.type === "commodity") {
      if (!route.commodity) {
        throw new Error("Missing commodity.");
      }

      const rows = state.allRows.filter((row) => {
        if (row.commodity !== route.commodity) {
          return false;
        }
        if (route.market && row.market !== route.market) {
          return false;
        }
        return true;
      });
      const locked = { commodity: route.commodity };
      if (route.market) {
        locked.market = route.market;
      }

      return {
        context: {
          type: "commodity",
          heading: route.commodity,
          locked,
          filters: getAvailableFilters(rows, route.market ? ["variety"] : ["market", "variety"]),
          resultLabel: route.market
            ? `${route.commodity} (${route.market} Market)`
            : `${route.commodity} (Commodity)`,
        },
        rows,
      };
    }

    if (route.type === "market") {
      if (!route.market) {
        throw new Error("Missing market.");
      }

      const rows = state.allRows.filter((row) => row.market === route.market);

      return {
        context: {
          type: "market",
          heading: route.market,
          locked: { market: route.market },
          filters: getAvailableFilters(rows, ["commodity", "variety"]),
          resultLabel: `${route.market} (Market)`,
        },
        rows,
      };
    }

    if (route.type === "variety") {
      if (!route.commodity || !route.variety) {
        throw new Error("Missing commodity or variety.");
      }

      const rows = state.allRows.filter((row) => {
        return row.commodity === route.commodity && row.variety === route.variety;
      });

      return {
        context: {
          type: "variety",
          heading: `${route.commodity} / ${route.variety}`,
          locked: { commodity: route.commodity, variety: route.variety },
          filters: getAvailableFilters(rows, ["market"]),
          resultLabel: `${route.variety} (${route.commodity})`,
        },
        rows,
      };
    }

    throw new Error("Invalid context type.");
  }

  function handleDocumentClick(event) {
    if (event.target.closest("[data-open-search]")) {
      return;
    }

    if (!state.isSearchOpen || event.target.closest("[data-search-root]")) {
      return;
    }

    closeSearchPanel();
  }

  function handleSearchInput(event) {
    state.query = event.target.value;
    const inputWrap = event.target.closest(".search-input-wrap");
    if (inputWrap) {
      inputWrap.classList.toggle("has-value", Boolean(state.query.trim()));
    }
    setPendingSearchUiState(state.query);
    syncSearchSuggestionsUi();
    scheduleSearchInputWork(state.query);
  }

  function handleSuggestionSelect(result) {
    const route = {
      view: "table",
      layout: state.route.view === "table" ? normalizeResultsLayout(state.route.layout) : getDefaultResultsLayout(),
      type: result.type,
      commodity: result.commodity || "",
      market: result.market || "",
      variety: result.variety || "",
      origin: isMarketCommoditySuggestion(result) ? "market-search" : "",
    };
    state.query = "";
    navigate(route);
  }

  function handleHomeClick() {
    state.query = "";
    state.isSearchOpen = false;
    navigate(getHomeRoute());
  }

  function getHomeRoute() {
    return {
      view: "home",
      layout: "cards",
      type: "",
      commodity: "",
      market: "",
      variety: "",
      origin: "",
    };
  }

  function openFilterModal() {
    state.isSearchOpen = false;
    state.isMarketJumpOpen = false;
    state.filterDrafts = cloneFilters(state.filters);
    state.filterSearches = buildInitialFilterSearches(state.context ? state.context.filters : []);
    resetFilterModalViewState();
    state.isFilterModalOpen = true;
    scheduleRender();
  }

  function closeFilterModal() {
    state.filterDrafts = cloneFilters(state.filters);
    state.filterSearches = buildInitialFilterSearches(state.context ? state.context.filters : []);
    resetFilterModalViewState();
    state.isFilterModalOpen = false;
    scheduleRender();
  }

  function resetFilterModalViewState() {
    state.pendingFilterSelection = null;
    state.activeFilterField = "";
  }

  function openSearchPanel() {
    if (state.isSearchOpen) {
      return;
    }

    state.isMarketJumpOpen = false;
    state.isSearchOpen = true;
    const trimmedQuery = state.query.trim();
    const shouldRefreshQuery = trimmedQuery.length >= SEARCH_MIN_QUERY_LENGTH
      && (state.searchUiState === "loading" || !state.suggestions.length);
    if (shouldRefreshQuery) {
      setPendingSearchUiState(state.query);
    }
    scheduleRender();

    if (shouldRefreshQuery) {
      window.setTimeout(() => {
        if (!state.isSearchOpen) {
          return;
        }

        syncSearchResultsForQuery(state.query);
        syncSearchSuggestionsUi();
      }, 0);
    }
  }

  function closeSearchPanel() {
    cancelSearchInputWork();
    state.isSearchOpen = false;
    scheduleRender();
  }

  function clearSearchAndClose() {
    cancelSearchInputWork();
    state.query = "";
    state.isSearchOpen = false;
    state.suggestions = [];
    scheduleRender();
  }

  function retrySearchIndex() {
    if (state.searchIndexStatus === "loading") {
      return;
    }

    state.searchIndexStatus = "loading";
    setPendingSearchUiState(state.query);
    syncSearchSuggestionsUi();
    loadSearchIndex();
  }

  function updateFilterSearch(name, value, selectionStart, selectionEnd) {
    state.filterSearches[name] = value;
    state.pendingFilterSelection = {
      hadFocus: true,
      field: name,
      selectionStart,
      selectionEnd,
      resetResultsScroll: true,
    };

    state.activeFilterField = name;
    syncFilterFieldUi(name);
  }

  function activateFilterField(name) {
    state.activeFilterField = state.activeFilterField === name ? "" : name;
    syncAllFilterFieldUis();
  }

  function toggleDraftFilterValue(name, value) {
    const selected = state.filterDrafts[name] || [];
    if (selected.includes(value)) {
      state.filterDrafts[name] = selected.filter((entry) => entry !== value);
    } else {
      state.filterDrafts[name] = [...selected, value];
    }

    syncDraftFilterFieldUi(name);
  }

  function syncDraftFilterFieldUi(field) {
    const resultsNode = document.querySelector(`[data-filter-results="${field}"]`);
    if (resultsNode && resultsNode.classList.contains("is-open")) {
      resultsNode.innerHTML = renderFilterOptionsMarkup(field);
      bindDraftFilterToggleEvents(resultsNode);
    }
  }

  function removeDraftFilterValue(name, value) {
    state.filterDrafts[name] = (state.filterDrafts[name] || []).filter((entry) => entry !== value);
    scheduleRender();
  }

  function commitFilterDrafts(options = {}) {
    const shouldCloseModal = options.closeModal !== false;
    state.filters = cloneFilters(state.filterDrafts);
    invalidateDerivedDataCaches();
    state.pendingFilterSelection = null;
    state.isMarketJumpOpen = false;
    if (shouldCloseModal) {
      resetFilterModalViewState();
      state.isFilterModalOpen = false;
    }
    state.activeChartDate = null;
    state.expandedRowKey = null;
    scheduleRender();
  }

  function removeAppliedFilterValue(name, value) {
    state.filters[name] = (state.filters[name] || []).filter((entry) => entry !== value);
    state.filterDrafts = cloneFilters(state.filters);
    resetFilterModalViewState();
    state.isMarketJumpOpen = false;
    invalidateDerivedDataCaches();
    state.activeChartDate = null;
    state.expandedRowKey = null;
    scheduleRender();
  }

  function applyFilterDrafts() {
    commitFilterDrafts();
  }

  function clearFilterDrafts() {
    Object.keys(state.filterDrafts).forEach((name) => {
      state.filterDrafts[name] = [];
      state.filterSearches[name] = "";
    });
    scheduleRender();
  }

  function setActiveChartDate(date) {
    state.activeChartDate = date;
    scheduleRender();
  }

  function setResultsLayout(layout) {
    state.shouldPrimeExpandedHistory = false;
  }

  function getActiveResultsLayout() {
    return "cards";
  }

  function isMarketSearchCommodityView(route = state.route) {
    return route.view === "table"
      && route.type === "commodity"
      && Boolean(route.market)
      && route.origin === "market-search";
  }

  function isHomeCommodityResultsView(route = state.route) {
    return route.view === "table"
      && route.type === "commodity"
      && !route.market
      && route.origin === "home";
  }

  function isVarietyResultsView(route = state.route) {
    return route.view === "table"
      && route.type === "variety"
      && !route.market;
  }

  function pickPreferredRepresentativeRow(existing, candidate) {
    if (!existing) {
      return candidate;
    }
    if (candidate.reportDate > existing.reportDate) {
      return candidate;
    }
    if (candidate.reportDate < existing.reportDate) {
      return existing;
    }

    const existingArrivals = Number.isFinite(Number(existing.arrivals)) ? Number(existing.arrivals) : -1;
    const candidateArrivals = Number.isFinite(Number(candidate.arrivals)) ? Number(candidate.arrivals) : -1;
    if (candidateArrivals > existingArrivals) {
      return candidate;
    }
    if (candidateArrivals < existingArrivals) {
      return existing;
    }

    return String(candidate.grade || "").localeCompare(String(existing.grade || "")) < 0 ? candidate : existing;
  }

  function isCompactViewport() {
    return window.innerWidth <= 767;
  }

  function getRowsForCurrentView() {
    const cacheKey = buildVisibleRowsCacheKey();
    if (cacheKey && state.cachedVisibleRowsKey === cacheKey) {
      return state.cachedVisibleRows;
    }

    const filteredRows = state.baseRows.filter((row) => {
      return Object.entries(state.filters).every(([key, value]) => {
        return !value.length || value.includes(row[key]);
      });
    });

    const latestRows = new Map();

    filteredRows.forEach((row) => {
      const groupKey = buildLatestRowGroupKey(row);
      latestRows.set(groupKey, pickPreferredRepresentativeRow(latestRows.get(groupKey), row));
    });

    const sortedRows = [...latestRows.values()].sort((left, right) => {
      const reportDateCompare = compareRowsByLatestReportDate(left, right);
      if (reportDateCompare !== 0) {
        return reportDateCompare;
      }

      return compareRowsForCurrentView(left, right);
    });

    state.cachedVisibleRowsKey = cacheKey;
    state.cachedVisibleRows = sortedRows;
    return sortedRows;
  }

  function compareRowsForCurrentView(left, right) {
    if (isMarketSearchCommodityView()) {
      const varietyCompare = left.variety.localeCompare(right.variety);
      if (varietyCompare !== 0) {
        return varietyCompare;
      }

      return right.reportDate.localeCompare(left.reportDate);
    }

    const marketCompare = left.market.localeCompare(right.market);
    if (marketCompare !== 0) {
      return marketCompare;
    }

    const commodityCompare = left.commodity.localeCompare(right.commodity);
    if (commodityCompare !== 0) {
      return commodityCompare;
    }

    const varietyCompare = left.variety.localeCompare(right.variety);
    if (varietyCompare !== 0) {
      return varietyCompare;
    }

    return left.grade.localeCompare(right.grade);
  }

  function compareRowsByLatestReportDate(left, right) {
    const leftDate = normalizeReportDateValue(left.reportDate);
    const rightDate = normalizeReportDateValue(right.reportDate);

    if (leftDate && !rightDate) {
      return -1;
    }
    if (!leftDate && rightDate) {
      return 1;
    }
    if (leftDate === rightDate) {
      return 0;
    }

    return rightDate.localeCompare(leftDate);
  }

  function buildLatestRowGroupKey(row) {
    if (isMarketSearchCommodityView()) {
      return [
        row.commodity,
        row.market,
        row.variety,
      ].join("|");
    }

    return [
      row.sourceId || "krama",
      row.commodity,
      row.market,
      row.variety,
      row.grade,
    ].join("|");
  }

  function getFilterOptions(field, sourceFilters = state.filters) {
    const cacheKey = `${field}::${serializeFilters(sourceFilters)}`;
    if (state.cachedFilterOptions[cacheKey]) {
      return state.cachedFilterOptions[cacheKey];
    }

    const rows = state.baseRows.filter((row) => {
      return Object.entries(sourceFilters).every(([key, value]) => {
        if (key === field) {
          return true;
        }
        return !value.length || value.includes(row[key]);
      });
    });
    const options = [...new Set(rows.map((row) => row[field]))].sort((left, right) => left.localeCompare(right));
    state.cachedFilterOptions[cacheKey] = options;
    return options;
  }

  function getDraftFilterOptions(field, query) {
    const options = getFilterOptions(field, state.filterDrafts);
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) {
      return options;
    }

    return options.filter((value) => {
      return normalizeSearchText(translateEntity(field, value)).includes(normalizedQuery)
        || normalizeSearchText(value).includes(normalizedQuery);
    });
  }

  function getHistoryRows(selectedRow) {
    const windowDays = selectedRow.perishability === "perishable" ? 7 : 30;
    const today = getLocalDateKey();
    const matchingRows = state.baseRows
      .filter((row) => {
        if (row.commodity !== selectedRow.commodity) return false;
        if (row.market !== selectedRow.market) return false;
        if (row.variety !== selectedRow.variety) return false;
        if (!isMarketSearchCommodityView() && row.sourceId !== selectedRow.sourceId) return false;
        if (!isMarketSearchCommodityView() && row.grade !== selectedRow.grade) return false;
        return row.reportDate && row.reportDate <= today;
      });

    if (!matchingRows.length) {
      return [];
    }

    const actualRows = matchingRows.sort((left, right) => left.reportDate.localeCompare(right.reportDate));
    const latestActualDate = actualRows[actualRows.length - 1].reportDate;
    const normalStartDate = addDateDays(today, -(windowDays - 1));
    const recentActualRows = actualRows.filter((row) => row.reportDate >= normalStartDate);
    const chartStartDate = latestActualDate < normalStartDate
      ? addDateDays(latestActualDate, -(windowDays - 1))
      : recentActualRows[0].reportDate;

    return buildForwardFilledHistoryRows(actualRows, chartStartDate, today);
  }

  function buildForwardFilledHistoryRows(actualRows, startDate, endDate) {
    const rowsByDate = new Map();
    const marketView = isMarketSearchCommodityView();

    actualRows.forEach((row) => {
      if (marketView) {
        rowsByDate.set(row.reportDate, pickPreferredRepresentativeRow(rowsByDate.get(row.reportDate), row));
        return;
      }

      const rowsForDate = rowsByDate.get(row.reportDate) || [];
      rowsForDate.push(row);
      rowsByDate.set(row.reportDate, rowsForDate);
    });

    const historyRows = [];
    let previousActualRow = null;
    let currentDate = startDate;

    while (currentDate <= endDate) {
      const rowsForDate = rowsByDate.get(currentDate);
      if (rowsForDate) {
        const actualDateRows = Array.isArray(rowsForDate) ? rowsForDate : [rowsForDate];
        actualDateRows.forEach((row) => {
          historyRows.push({
            ...row,
            isCarriedForward: false,
            sourceReportDate: row.reportDate,
          });
        });
        previousActualRow = actualDateRows[actualDateRows.length - 1];
      } else if (previousActualRow) {
        historyRows.push({
          ...previousActualRow,
          rowKey: `${previousActualRow.rowKey}|carried-forward|${currentDate}`,
          reportDate: currentDate,
          isCarriedForward: true,
          sourceReportDate: previousActualRow.reportDate,
        });
      }

      currentDate = addDateDays(currentDate, 1);
    }

    return historyRows;
  }

  function getLocalDateKey(date = new Date()) {
    return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
  }

  function addDateDays(dateKey, days) {
    const parts = getDisplayDateParts(dateKey);
    if (!parts) {
      return dateKey;
    }

    const date = new Date(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
    date.setDate(date.getDate() + days);
    return getLocalDateKey(date);
  }

  function getAvailableFilters(rows, candidates) {
    return candidates.filter((field) => rowsHaveValues(rows, field));
  }

  function rowsHaveValues(rows, field) {
    return rows.some((row) => String(row[field] || "").trim());
  }

  function hasArrivalsData(row) {
    return row.arrivals !== null && row.arrivals !== undefined && row.arrivals !== ""
      && String(row.unit || "").trim();
  }

  function getPriceUnitLabel(row) {
    const rawUnit = String(
      (row && row.priceDisplayUnit)
      || (row && row.unit)
      || "Quintal"
    ).trim();
    const normalized = rawUnit.toLowerCase();

    if (!normalized) {
      return "Qtl";
    }
    if (normalized === "quintal") {
      return "Qtl";
    }
    if (normalized === "kg" || normalized === "per kg") {
      return "kg";
    }
    if (normalized === "50 kg") {
      return "50 kg";
    }
    if (normalized === "per 100 kg" || normalized === "100 kg") {
      return "100 kg";
    }
    if (normalized === "100 eggs" || normalized === "100 pieces") {
      return "100 pieces";
    }
    if (normalized === "numbers" || normalized === "number") {
      return "piece";
    }
    if (normalized === "thousands" || normalized === "thousand") {
      return "1000 pieces";
    }

    return rawUnit;
  }

  function formatPriceUnit(unit) {
    return `₹/${unit}`;
  }

  function getRowPriceProfile(row) {
    if (row && row.sourceId === "necc_egg") {
      return {
        mode: "single",
        columns: [
          {
            kind: "max",
            key: "canonicalPrice",
            label: getSinglePriceLabel(row),
            color: PRICE_COLORS.max,
            strokeWidth: "3.5",
            dashArray: "",
          },
        ],
      };
    }

    if (row && row.sourceId === "spices_board") {
      return {
        mode: "single",
        columns: [
          {
            kind: "max",
            key: "canonicalPrice",
            label: getSinglePriceLabel(row),
            color: PRICE_COLORS.max,
            strokeWidth: "3.5",
            dashArray: "",
          },
        ],
      };
    }

    if (row && row.sourceId === "rubber_board") {
      return {
        mode: "single",
        columns: [
          {
            kind: "max",
            key: "canonicalPrice",
            label: getSinglePriceLabel(row),
            color: PRICE_COLORS.max,
            strokeWidth: "3.5",
            dashArray: "",
          },
        ],
      };
    }

    if (row && row.sourceId === "coffee_board") {
      const priceUnit = getPriceUnitLabel(row);
      return {
        mode: "range",
        columns: [
          {
            kind: "max",
            key: "maxPrice",
            label: buildRsPerUnitLabel("Max Price", priceUnit),
            color: PRICE_COLORS.max,
            strokeWidth: "3.5",
            dashArray: "",
          },
          {
            kind: "min",
            key: "minPrice",
            label: buildRsPerUnitLabel("Min Price", priceUnit),
            color: PRICE_COLORS.min,
            strokeWidth: "3",
            dashArray: "",
          },
        ],
      };
    }

    if (row && row.sourceId === "csb_silk") {
      const priceUnit = getPriceUnitLabel(row);
      return {
        mode: "triple",
        columns: [
          {
            kind: "max",
            key: "maxPrice",
            label: buildRsPerUnitLabel("Max Price", priceUnit),
            color: PRICE_COLORS.max,
            strokeWidth: "3.5",
            dashArray: "",
          },
          {
            kind: "modal",
            key: "modalPrice",
            label: buildRsPerUnitLabel("Average Price", priceUnit),
            color: PRICE_COLORS.modal,
            strokeWidth: "3",
            dashArray: "",
          },
          {
            kind: "min",
            key: "minPrice",
            label: buildRsPerUnitLabel("Min Price", priceUnit),
            color: PRICE_COLORS.min,
            strokeWidth: "3",
            dashArray: "",
          },
        ],
      };
    }

    const priceUnit = getPriceUnitLabel(row);
    return {
      mode: "triple",
      columns: [
        {
          kind: "max",
          key: "maxPrice",
          label: buildRsPerUnitLabel("Max Price", priceUnit),
          color: PRICE_COLORS.max,
          strokeWidth: "3.5",
          dashArray: "",
        },
        {
          kind: "modal",
          key: "modalPrice",
          label: buildRsPerUnitLabel("Modal Price", priceUnit),
          color: PRICE_COLORS.modal,
          strokeWidth: "3",
          dashArray: "",
        },
        {
          kind: "min",
          key: "minPrice",
          label: buildRsPerUnitLabel("Min Price", priceUnit),
          color: PRICE_COLORS.min,
          strokeWidth: "3",
          dashArray: "",
        },
      ],
    };
  }

  function buildRsPerUnitLabel(baseLabel, unit) {
    return `${baseLabel} (${formatPriceUnit(unit)})`;
  }

  function getSinglePriceLabel(row) {
    const unit = getPriceUnitLabel(row);
    return `Price (${formatPriceUnit(unit)})`;
  }

  function getRowPriceMode(row) {
    return getRowPriceProfile(row).mode;
  }

  function getCanonicalPriceKey(row) {
    const profile = getRowPriceProfile(row);
    return profile.columns[0] ? profile.columns[0].key : "modalPrice";
  }

  function getCanonicalPriceLabel(row) {
    const profile = getRowPriceProfile(row);
    return profile.columns[0] ? profile.columns[0].label : getUiText("modal_short", "Modal");
  }

  function getPriceHeaders(row) {
    return getRowPriceProfile(row).columns.map((column) => column.label);
  }

  function buildMetaEntries(entries) {
    return entries.filter((entry) => String(entry.value || "").trim());
  }

  function buildResultCells(row, leadingCells, includeVariety, includeGrade) {
    const cells = leadingCells.map((entry) => {
      const value = entry.kind === "commodity"
        ? translateEntity("commodity", row.commodity)
        : translateEntity("market", row.market);
      return `<td${entry.primary ? ' class="result-col-primary"' : ""}>${escapeHtml(value)}</td>`;
    });
    if (includeVariety) {
      cells.push(`<td>${escapeHtml(translateEntity("variety", row.variety))}</td>`);
    }
    if (includeGrade) {
      cells.push(`<td>${escapeHtml(row.grade || "-")}</td>`);
    }
    return cells;
  }

  function renderPriceSection(row, previousRow, priceMode, canonicalKey) {
    return getRowPriceProfile(row).columns.map((column) => {
      return renderPriceGroup(
        column.kind,
        column.label,
        row[column.key],
        getPreviousPriceDelta(row, column.key, previousRow)
      );
    }).join("");
  }

  function renderPriceColumns(row, previousRow, priceMode, canonicalKey) {
    return getRowPriceProfile(row).columns.map((column) => `
      <td class="result-col-price">
        <span class="price-value price-value-${escapeAttribute(column.kind)}">${formatCurrency(row[column.key])}</span>
        ${renderPriceDelta(getPreviousPriceDelta(row, column.key, previousRow))}
      </td>
    `).join("");
  }

  function getChartMetricKeys(row) {
    return getRowPriceProfile(row).columns.map((column) => ({
      key: column.key,
      kind: column.kind,
      label: column.label,
      color: column.color,
      strokeWidth: column.strokeWidth,
      dashArray: column.dashArray,
    }));
  }

  function formatArrivalsUnits(row) {
    return `${formatNumber(row.arrivals)} ${row.unit}`;
  }

  function getTrendNote(row) {
    if (row && row.sourceId === "necc_egg") {
      return getUiText("trend_note_egg", "Trend is shown for this exact commodity and market combination.");
    }
    return getUiText("trend_note", "Trend is shown for this exact commodity, market, variety, and grade combination.");
  }

  function formatLockedHeadings() {
    if (!state.context) {
      return "";
    }
    const tone = getResultTypeTone(state.context.type);
    return Object.entries(state.context.locked)
      .map(([key, value]) => `<span class="locked-heading-pill locked-heading-pill-${escapeAttribute(tone)}">${escapeHtml(getFieldLabel(key))}: ${escapeHtml(translateEntity(key, value))}</span>`)
      .join("");
  }

  function render() {
    document.documentElement.setAttribute("lang", state.locale === "kn" ? "kn" : "en");
    document.documentElement.setAttribute("data-locale", state.locale);
    const searchInputState = captureSearchInputState();
    const filterInputState = captureFilterInputState();
    const scrollState = captureScrollState();
    const rows = state.route.view === "table" && state.context ? getRowsForCurrentView() : [];
    teardownStickyTableHeader();

    app.innerHTML = `
      <div class="shell">
        <div class="shell-top">
          ${renderTopBar()}
        </div>
        <main>
          <section class="view ${state.route.view === "home" ? "active" : ""}" id="homeView">
            <div class="home-stack">
              <section class="panel welcome-card">
                <div class="welcome-copy">
                  <h2>${escapeHtml(getUiText("app_title"))}</h2>
                  <p>${escapeHtml(getUiText("home_intro"))}</p>
                </div>
              </section>

              ${renderSearchPanel()}

              ${renderCategorySection()}
            </div>
          </section>

          <section class="view ${state.route.view === "table" ? "active" : ""}" id="tableView">
            <div class="table-stack">
              ${renderSearchPanel()}

              <section class="panel table-card">
                <div class="table-head">
                  <div>
                    <div class="locked-headings">${formatLockedHeadings()}</div>
                    <p>${getResultsIntroCopy()}</p>
                  </div>
                </div>

                ${renderResultsLayoutToggle()}
                ${renderActiveFilterSummary()}
                ${renderBackToTopButton(rows)}
                ${renderFilterLauncher()}
                ${getActiveResultsLayout() === "table" ? renderStickyTableHeader(rows) : ""}

                <div class="table-wrap" data-preserve-scroll-id="table-wrap">
                  ${renderResults(rows)}
                </div>
              </section>
            </div>
          </section>
        </main>
        ${renderFilterModal()}
        ${renderShareFeedback()}
      </div>
    `;

    bindEvents();
    restoreSearchInputState(searchInputState);
    restoreFilterInputState(filterInputState);
    restoreScrollState(scrollState);
    runPostRenderEffects();
  }

  function captureSearchInputState() {
    return captureFocusedInputState("[data-global-search]");
  }

  function restoreSearchInputState(snapshot) {
    restoreFocusedInputState(".view.active [data-global-search]", snapshot);
  }

  function captureFilterInputState() {
    if (state.pendingFilterSelection) {
      const snapshot = { ...state.pendingFilterSelection };
      state.pendingFilterSelection = null;
      return snapshot;
    }

    const snapshot = captureFocusedInputState("[data-filter-search]");
    if (!snapshot) {
      return null;
    }

    return {
      ...snapshot,
      field: document.activeElement.dataset.filterSearch || "",
    };
  }

  function restoreFilterInputState(snapshot) {
    if (!snapshot || !snapshot.field) {
      return;
    }

    restoreFocusedInputState(`[data-filter-search="${snapshot.field}"]`, snapshot);

    if (snapshot.resetResultsScroll) {
      const resultsNode = document.querySelector(`[data-filter-results="${snapshot.field}"]`);
      if (resultsNode) {
        resultsNode.scrollTop = 0;
      }
    }
  }

  function captureFocusedInputState(selector) {
    const input = document.activeElement;
    if (!input || !input.matches(selector)) {
      return null;
    }

    return {
      hadFocus: document.activeElement === input,
      selectionStart: input.selectionStart,
      selectionEnd: input.selectionEnd,
    };
  }

  function restoreFocusedInputState(selector, snapshot) {
    if (!snapshot || !snapshot.hadFocus) {
      return;
    }

    const input = document.querySelector(selector);
    if (!input) {
      return;
    }

    input.focus();
    if (typeof snapshot.selectionStart === "number" && typeof snapshot.selectionEnd === "number") {
      input.setSelectionRange(snapshot.selectionStart, snapshot.selectionEnd);
    }
  }

  function captureScrollState() {
    const tableWrap = document.querySelector("[data-preserve-scroll-id='table-wrap']");
    const tableScroller = tableWrap ? tableWrap.querySelector(".results-table-wrap") : null;
    const filterModalBody = document.querySelector("[data-preserve-scroll-id='filter-modal-body']");
    const filterResults = [...document.querySelectorAll("[data-preserve-scroll-id='filter-search-results']")];
    const chartScroll = document.querySelector("[data-preserve-scroll-id='chart-scroll']");
    const homeCategoryRail = document.querySelector("[data-home-category-rail]");
    const homeCommodityRail = document.querySelector("[data-home-commodity-rail]");
    return {
      windowX: window.scrollX,
      windowY: lockedBodyScrollY !== null ? lockedBodyScrollY : window.scrollY,
      homeCategoryRail: homeCategoryRail ? {
        scrollLeft: homeCategoryRail.scrollLeft,
      } : null,
      homeCommodityRail: homeCommodityRail ? {
        scrollLeft: homeCommodityRail.scrollLeft,
      } : null,
      tableWrap: (tableScroller || tableWrap) ? {
        scrollLeft: (tableScroller || tableWrap).scrollLeft,
        scrollTop: (tableScroller || tableWrap).scrollTop,
      } : null,
      filterModalBody: filterModalBody ? {
        scrollTop: filterModalBody.scrollTop,
      } : null,
      chartScroll: chartScroll ? {
        rowKey: chartScroll.dataset.chartRowKey || "",
        scrollLeft: chartScroll.scrollLeft,
        scrollTop: chartScroll.scrollTop,
      } : null,
      filterResults: filterResults.map((node) => ({
        field: node.dataset.filterField || "",
        scrollTop: node.scrollTop,
      })),
    };
  }

  function restoreScrollState(snapshot) {
    if (!snapshot) {
      return;
    }

    window.scrollTo(snapshot.windowX, snapshot.windowY);

    if (snapshot.homeCategoryRail) {
      const homeCategoryRail = document.querySelector("[data-home-category-rail]");
      if (homeCategoryRail) {
        homeCategoryRail.scrollLeft = snapshot.homeCategoryRail.scrollLeft;
      }
    }

    if (snapshot.homeCommodityRail) {
      const homeCommodityRail = document.querySelector("[data-home-commodity-rail]");
      if (homeCommodityRail) {
        homeCommodityRail.scrollLeft = snapshot.homeCommodityRail.scrollLeft;
      }
    }

    if (!snapshot.tableWrap) {
      if (snapshot.filterModalBody || (snapshot.filterResults && snapshot.filterResults.length)) {
        restoreFilterScrollState(snapshot);
      }
      return;
    }

    const tableWrap = document.querySelector("[data-preserve-scroll-id='table-wrap']");
    const tableScroller = tableWrap ? tableWrap.querySelector(".results-table-wrap") : null;
    const tableTarget = tableScroller || tableWrap;
    if (!tableTarget) {
      restoreChartScrollState(snapshot);
      if (snapshot.filterModalBody || (snapshot.filterResults && snapshot.filterResults.length)) {
        restoreFilterScrollState(snapshot);
      }
      return;
    }

    tableTarget.scrollLeft = snapshot.tableWrap.scrollLeft;
    tableTarget.scrollTop = snapshot.tableWrap.scrollTop;
    restoreChartScrollState(snapshot);
    restoreFilterScrollState(snapshot);
  }

  function restoreChartScrollState(snapshot) {
    if (!state.expandedRowKey) {
      return;
    }

    const chartScroll = document.querySelector("[data-preserve-scroll-id='chart-scroll']");
    if (!chartScroll) {
      return;
    }

    if (snapshot.chartScroll && snapshot.chartScroll.rowKey === state.expandedRowKey) {
      chartScroll.scrollLeft = snapshot.chartScroll.scrollLeft;
      chartScroll.scrollTop = snapshot.chartScroll.scrollTop;
      return;
    }

    if (chartScroll.dataset.chartInitialPosition === "right") {
      if (chartScroll.dataset.chartActiveX) {
        chartScroll.scrollLeft = getChartAnchoredScrollLeft(chartScroll);
        return;
      }
      chartScroll.scrollLeft = chartScroll.scrollWidth - chartScroll.clientWidth;
    }
  }

  function restoreFilterScrollState(snapshot) {
    if (snapshot.filterModalBody) {
      const filterModalBody = document.querySelector("[data-preserve-scroll-id='filter-modal-body']");
      if (filterModalBody) {
        filterModalBody.scrollTop = snapshot.filterModalBody.scrollTop;
      }
    }

    (snapshot.filterResults || []).forEach((entry) => {
      if (!entry.field) {
        return;
      }
      const node = document.querySelector(`[data-preserve-scroll-id='filter-search-results'][data-filter-field="${entry.field}"]`);
      if (node) {
        node.scrollTop = entry.scrollTop;
      }
    });
  }

  function renderSearchPanel() {
    return `
      <section class="panel search-panel" data-search-root>
        <label class="search-label">${escapeHtml(getUiText("search_label"))}</label>
        <div class="search-box">
          <span>&#8981;</span>
          <input
            type="text"
            autocomplete="off"
            placeholder="${escapeAttribute(getUiText("search_placeholder"))}"
            value="${escapeAttribute(state.query)}"
            data-global-search="true"
          >
        </div>
        <div data-search-suggestions>${state.suggestions.length ? renderSuggestions() : ""}</div>
      </section>
    `;
  }

  function renderCategorySection() {
    if (!state.categoryGroups.length) {
      return "";
    }

    const activeCategory = getActiveHomeCategory();
    if (!activeCategory) {
      return "";
    }

    return `
      <section class="panel category-panel" aria-label="Commodity categories">
        <div class="category-panel-head">
          <div>
            <h3>${escapeHtml(getUiText("category_title"))}</h3>
            <p class="muted category-swipe-hint category-swipe-hint-mobile">${escapeHtml(getUiText("category_swipe_hint"))}</p>
          </div>
        </div>

        <div class="category-rail" role="tablist" aria-label="Commodity categories" data-home-category-rail="true">
          ${state.categoryGroups.map((category) => {
            const isActive = category.id === state.activeHomeCategoryId;
            return `
              <button
                type="button"
                class="category-pill ${isActive ? "is-active" : ""}"
                data-home-category="${escapeAttribute(category.id)}"
                role="tab"
                aria-selected="${isActive ? "true" : "false"}"
              >
                <span class="category-pill-icon" aria-hidden="true">${escapeHtml(getCategoryIcon(category.id))}</span>
                <span class="category-pill-copy">
                  <strong>${escapeHtml(getCategoryLabel(category.id, category.label))}</strong>
                </span>
              </button>
            `;
          }).join("")}
        </div>

        <div class="commodity-rail-wrap">
          <p class="muted commodity-rail-helper-desktop">${escapeHtml(getUiText("commodity_scroll_hint_desktop", "\u2190 Scroll to see all options \u2192"))}</p>
          <div class="commodity-rail-meta">
            <span class="commodity-rail-count">${formatCountLabel(activeCategory.commodityCount, "commodity", "commodities")}</span>
          </div>
          <div class="commodity-rail" aria-label="${escapeAttribute(getCategoryLabel(activeCategory.id, activeCategory.label))} commodities" data-home-commodity-rail="true">
            ${activeCategory.commodities.map((commodity) => `
              <button
                type="button"
                class="commodity-pill"
                data-home-commodity="${escapeAttribute(commodity)}"
              >
                <span class="commodity-pill-icon" aria-hidden="true">${escapeHtml(getCommodityIcon(commodity, activeCategory.id))}</span>
                <span class="commodity-pill-label">${escapeHtml(translateEntity("commodity", commodity))}</span>
              </button>
            `).join("")}
          </div>
        </div>
      </section>
    `;
  }

  function getResultsIntroCopy() {
    if (getActiveResultsLayout() === "table") {
      return getUiText("results_intro_table");
    }
    return getUiText("results_intro_cards");
  }

  function renderResultsLayoutToggle() {
    if (state.route.view !== "table") {
      return "";
    }

    const activeLayout = getActiveResultsLayout();
    return `
      <div class="results-layout-toggle" role="group" aria-label="${escapeAttribute(getUiText("results_layout_aria", "Results layout"))}">
        <button type="button" class="results-layout-button ${activeLayout === "cards" ? "is-active" : ""}" data-results-layout="cards" aria-pressed="${activeLayout === "cards" ? "true" : "false"}">${escapeHtml(getUiText("layout_cards", "Cards"))}</button>
        <button type="button" class="results-layout-button ${activeLayout === "table" ? "is-active" : ""}" data-results-layout="table" aria-pressed="${activeLayout === "table" ? "true" : "false"}">${escapeHtml(getUiText("layout_table", "Table"))}</button>
      </div>
    `;
  }

  function renderLocaleToggle() {
    return `
      <div class="locale-toggle" role="group" aria-label="${escapeAttribute(getUiText("language_aria", "Language"))}">
        <button type="button" class="locale-toggle-button ${state.locale === "en" ? "is-active" : ""}" data-locale-toggle="en">${escapeHtml(getUiText("language_english", "English"))}</button>
        <button type="button" class="locale-toggle-button ${state.locale === "kn" ? "is-active" : ""}" data-locale-toggle="kn">${escapeHtml(getUiText("language_kannada", "Kannada"))}</button>
      </div>
    `;
  }

  function renderTopBar() {
    return `
      <div class="shell-top-inner">
        <div class="shell-top-left">
        </div>
        ${renderLocaleToggle()}
      </div>
    `;
  }

  function renderSuggestions() {
    return `
      <div class="suggestions">
        ${state.suggestions.map((result, index) => {
          const tone = getResultTypeTone(result.type);
          return `
            <button type="button" class="suggestion-item suggestion-item-${escapeAttribute(tone)}" data-suggestion-index="${index}">
              <span class="suggestion-copy">
                <strong class="suggestion-title">${highlightMatch(getSuggestionLabel(result), state.query)}</strong>
                <span class="suggestion-meta-row">
                  <span class="suggestion-tag suggestion-tag-${escapeAttribute(tone)}">${escapeHtml(getSuggestionTypeLabel(result.type))}</span>
                  <small>${escapeHtml(getSuggestionMeta(result))}</small>
                </span>
              </span>
            </button>
          `;
        }).join("")}
      </div>
    `;
  }

  function syncSearchSuggestionsUi() {
    document.querySelectorAll("[data-search-suggestions]").forEach((node) => {
      const searchUiState = getSearchUiState();
      node.classList.toggle("is-active", searchUiState !== "hidden");
      node.classList.toggle("is-scrollable", searchUiState === "ready");
      node.innerHTML = renderSearchOverlayContent(searchUiState);
    });

    bindSuggestionEvents();
    bindSearchStateEvents();
  }

  function getSuggestionLabel(result) {
    if (result.type === "commodity") {
      return translateEntity("commodity", result.commodity);
    }
    if (result.type === "market") {
      return translateEntity("market", result.market);
    }
    if (isCommodityVarietySuggestion(result)) {
      return `${translateEntity("commodity", result.commodity)} / ${translateEntity("variety", result.variety)}`;
    }
    return translateEntity("variety", result.variety);
  }

  function isMarketCommoditySuggestion(result) {
    return result && result.type === "commodity" && result.matchType === "market" && Boolean(result.market);
  }

  function isCommodityVarietySuggestion(result) {
    return result && result.type === "variety" && result.matchType === "commodity-variety";
  }

  function getSuggestionDisplayType(value) {
    if (typeof value === "string") {
      return value;
    }
    return isMarketCommoditySuggestion(value) ? "market" : value.type;
  }

  function getSuggestionMeta(result) {
    const actionText = result.type === "commodity"
      ? getUiText("suggestion_meta_commodity", "Opens commodity results")
      : result.type === "market"
        ? getUiText("suggestion_meta_market", "Opens market results")
        : getUiText("suggestion_meta_variety", "Opens variety results");

    if (isMarketCommoditySuggestion(result)) {
      return `${translateEntity("market", result.market)} - ${getUiText("suggestion_meta_market_commodity", "Opens this commodity in the selected market")}`;
    }

    if (result.type !== "variety") {
      return actionText;
    }

    return `${translateEntity("commodity", result.commodity)} - ${actionText}`;
  }

  function getSuggestionTypeLabel(value) {
    const type = getSuggestionDisplayType(value);
    return getUiText(`field_${type}`, SEARCH_RESULT_TYPE_LABELS[type] || type);
  }

  function getResultTypeTone(value) {
    const type = getSuggestionDisplayType(value);
    if (type === "market") {
      return "market";
    }
    if (type === "variety") {
      return "variety";
    }
    return "commodity";
  }

  function getActiveHomeCategory() {
    if (!state.categoryGroups.length) {
      return null;
    }
    return state.categoryGroups.find((category) => category.id === state.activeHomeCategoryId) || state.categoryGroups[0];
  }

  function getCategoryLabel(categoryId, fallbackLabel) {
    return getUiText(`category_${categoryId}`, fallbackLabel || categoryId);
  }

  function getCategoryIcon(categoryId) {
    return CATEGORY_ICONS[categoryId] || "🧺";
  }

  function getCategoryThumb(categoryId) {
    return CATEGORY_TAB_THUMBS[categoryId] || ASSETS.categoryThumb;
  }

  function getCommodityIcon(commodity, categoryId) {
    return COMMODITY_ICONS[commodity] || getCategoryIcon(categoryId);
  }

  function hasBakedCommodityThumb(commodity) {
    return Boolean(BAKED_COMMODITY_THUMBS[commodity]);
  }

  function getCommodityThumb(commodity) {
    return BAKED_COMMODITY_THUMBS[commodity] || ASSETS.commodityThumb;
  }

  function getCommodityThumbWrapClass(commodity) {
    return hasBakedCommodityThumb(commodity) ? "thumb-wrap-baked" : "";
  }

  function formatCountLabel(count, singular, plural) {
    return `${count} ${count === 1 ? singular : plural}`;
  }

  function handleHomeCategorySelect(categoryId) {
    if (!categoryId || categoryId === state.activeHomeCategoryId) {
      return;
    }
    state.activeHomeCategoryId = categoryId;
    state.shouldRevealActiveHomeCategory = true;
    scheduleRender();
  }

  function handleHomeCommoditySelect(commodity) {
    navigate({
      view: "table",
      layout: getDefaultResultsLayout(),
      type: "commodity",
      commodity,
      market: "",
      variety: "",
      origin: "home",
    });
  }

  function renderFilterLauncher() {
    if (!state.context || !state.context.filters.length) {
      return "";
    }

    return `
      <button type="button" class="filter-fab ${state.showFilterHint ? "is-expanded is-highlighted" : ""}" data-open-filter-modal="true" aria-label="${escapeAttribute(getUiText("filter_open_aria", "Open filters"))}">
        <span class="filter-fab-icon">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 6h16l-6 7v5l-4 2v-7z" fill="currentColor"></path>
          </svg>
        </span>
        <span class="filter-fab-label">${escapeHtml(getUiText("filter_fab_label", "Use filters here"))}</span>
      </button>
    `;
  }

  function getMarketJumpTargets(rows) {
    const seenMarkets = new Set();
    return rows.reduce((targets, row) => {
      if (!row.market || seenMarkets.has(row.market)) {
        return targets;
      }

      seenMarkets.add(row.market);
      targets.push({
        value: row.market,
        label: translateEntity("market", row.market),
      });
      return targets;
    }, []);
  }

  function canRenderMarketJump(rows) {
    return (isHomeCommodityResultsView() || isVarietyResultsView())
      && getActiveResultsLayout() === "cards"
      && getMarketJumpTargets(rows).length > 1;
  }

  function openMarketJump() {
    const rows = state.route.view === "table" && state.context ? getRowsForCurrentView() : [];
    if (!canRenderMarketJump(rows)) {
      return;
    }

    state.isSearchOpen = false;
    state.isFilterModalOpen = false;
    state.isMarketJumpOpen = true;
    scheduleRender();
  }

  function closeMarketJump() {
    if (!state.isMarketJumpOpen) {
      return;
    }

    state.isMarketJumpOpen = false;
    scheduleRender();
  }

  function renderMarketJumpLauncher(rows) {
    if (!canRenderMarketJump(rows)) {
      return "";
    }

    return `
      <button type="button" class="filter-fab market-jump-fab" data-open-market-jump="true" aria-label="${escapeAttribute(getUiText("market_jump_open_aria", "Open market navigator"))}">
        <span class="filter-fab-icon">
          <img src="${escapeAttribute(ASSETS.suggestionMarket)}" alt="" loading="lazy" decoding="async">
        </span>
      </button>
    `;
  }

  function renderBackToTopButton(rows) {
    if (state.route.view !== "table" || getActiveResultsLayout() !== "cards" || rows.length < 5) {
      return "";
    }

    return `
      <button type="button" class="filter-fab back-to-top-fab" data-back-to-top="true" aria-label="${escapeAttribute(getUiText("back_to_top_aria", "Back to top"))}" aria-hidden="true" tabindex="-1">
        <span class="filter-fab-icon">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 5l-7 7 2.12 2.12 3.38-3.38V19h3v-8.26l3.38 3.38L19 12z" fill="currentColor"></path>
          </svg>
        </span>
      </button>
    `;
  }

  function renderActiveFilterSummary() {
    if (!state.context) {
      return "";
    }

    const activeChips = state.context.filters.flatMap((field) => {
      return (state.filters[field] || []).map((value) => ({ field, value }));
    });

    if (!activeChips.length) {
      return "";
    }

    return `
      <div class="active-filter-summary" aria-label="${escapeAttribute(getUiText("filters_label", "Filters"))}">
        ${activeChips.map(({ field, value }) => `
          <span class="filter-chip filter-chip-active ${escapeAttribute(getFilterFieldToneClass(field))}">
            <span>${escapeHtml(`${getFieldLabel(field)}: ${translateEntity(field, value)}`)}</span>
            <button type="button" class="filter-chip-remove" data-remove-active-filter="${field}" data-remove-active-value="${escapeAttribute(value)}" aria-label="${escapeAttribute(`${getUiText("remove_value_prefix", "Remove")} ${getFieldLabel(field)} ${translateEntity(field, value)}`)}">&times;</button>
          </span>
        `).join("")}
      </div>
    `;
  }

  function renderFilterModal() {
    if (!state.context || !state.context.filters.length || !state.isFilterModalOpen) {
      return "";
    }

    return `
      <div class="filter-modal-backdrop" data-close-filter-modal="backdrop">
        <section class="filter-modal panel" role="dialog" aria-modal="true" aria-label="${escapeAttribute(getUiText("filters_label", "Filters"))}">
          <div class="filter-modal-head">
            <div>
              <h3>${escapeHtml(getUiText("refine_results", "Refine results"))}</h3>
            </div>
            <button type="button" class="filter-modal-close" data-close-filter-modal="button" aria-label="${escapeAttribute(getUiText("close_filters_aria", "Close filters"))}">&times;</button>
          </div>
          <div class="filter-modal-body" data-preserve-scroll-id="filter-modal-body">
            ${state.context.filters.map((field) => renderFilterField(field)).join("")}
          </div>
          <div class="filter-modal-actions">
            <button type="button" class="inline-button filter-clear-inline" data-clear-filter-drafts="true">${escapeHtml(getUiText("clear_filters", "Clear Filters"))}</button>
            <button type="button" class="clear-button filter-apply-button" data-apply-filter-drafts="true">${escapeHtml(getUiText("apply_filters", "Apply Filters"))}</button>
          </div>
        </section>
      </div>
    `;
  }

  function renderShareFeedback() {
    if (!state.shareFeedback) {
      return "";
    }

    return `
      <div class="share-feedback share-feedback-${escapeAttribute(state.shareFeedback.tone || "success")}" role="status" aria-live="polite">
        ${escapeHtml(state.shareFeedback.message)}
      </div>
    `;
  }

  function renderFilterField(field) {
    const selected = state.filterDrafts[field] || [];
    const options = getDraftFilterOptions(field, "");
    const isOpen = state.activeFilterField === field;
    const summary = getFilterTriggerSummary(field, selected);

    return `
      <div class="filter-modal-group">
        <label>${escapeHtml(`${getFieldLabel(field)} ${getUiText("filter_suffix", "filter")}`)}</label>
        <div class="filter-multiselect">
          <button
            type="button"
            class="filter-dropdown-trigger ${isOpen ? "is-open" : ""}"
            data-filter-toggle="${field}"
            aria-expanded="${isOpen ? "true" : "false"}"
          >
            <span>${escapeHtml(getUiText("tap_to_select", "Tap to Select"))}</span>
            <span class="filter-trigger-chevron" aria-hidden="true">${isOpen ? "&#9650;" : "&#9660;"}</span>
          </button>
          <div class="filter-search-results ${isOpen ? "is-open" : ""}" data-preserve-scroll-id="filter-search-results" data-filter-results="${field}" data-filter-field="${field}">
            ${isOpen ? (options.length ? options.map((value) => `
              <button
                type="button"
                class="filter-search-option ${selected.includes(value) ? "is-selected" : ""}"
                data-toggle-draft-filter="${field}"
                data-toggle-draft-value="${escapeAttribute(value)}"
              >
                <span>${escapeHtml(translateEntity(field, value))}</span>
                ${selected.includes(value) ? `<span class="filter-option-check">&#10003;</span>` : ""}
              </button>
            `).join("") : `<p class="muted filter-empty-note">${escapeHtml(getUiText("no_matching_options", "No matching options."))}</p>`) : ""}
          </div>
        </div>
      </div>
    `;
  }

  function renderFilterOptionsMarkup(field) {
    const selected = state.filterDrafts[field] || [];
    const query = state.filterSearches[field] || "";
    const options = getDraftFilterOptions(field, query);

    if (!options.length) {
      return `<p class="muted filter-empty-note">${escapeHtml(getUiText("no_matching_options", "No matching options."))}</p>`;
    }

    return options.map((value) => `
      <button
        type="button"
        class="option-row filter-search-option ${selected.includes(value) ? "selected is-selected" : ""}"
        data-toggle-draft-filter="${field}"
        data-toggle-draft-value="${escapeAttribute(value)}"
      >
        <span>${escapeHtml(translateEntity(field, value))}</span>
        <span class="checkbox-box">${selected.includes(value) ? '<span class="checkbox-check" aria-hidden="true"></span>' : ""}</span>
      </button>
    `).join("");
  }

  function getFilterSelectionCountText(count) {
    if (count === 1) {
      return getUiText("filter_selected_one", "1 selected");
    }
    return getUiText("filter_selected_many", "{count} selected").replace("{count}", String(count));
  }

  function getFilterTriggerSummary(field, selected) {
    if (!selected.length) {
      return getAllLabel(field);
    }
    if (selected.length === 1) {
      return translateEntity(field, selected[0]);
    }
    return getFilterSelectionCountText(selected.length);
  }

  function syncFilterFieldUi(field) {
    const resultsNode = document.querySelector(`[data-filter-results="${field}"]`);
    if (!resultsNode) {
      return;
    }

    document.querySelectorAll("[data-filter-results]").forEach((node) => {
      node.classList.toggle("is-open", node.dataset.filterResults === state.activeFilterField);
    });

    if (state.activeFilterField === field) {
      resultsNode.innerHTML = renderFilterOptionsMarkup(field);
      bindDraftFilterToggleEvents(resultsNode);
    } else {
      resultsNode.innerHTML = "";
    }
  }

  function syncAllFilterFieldUis() {
    document.querySelectorAll("[data-filter-results]").forEach((node) => {
      const field = node.dataset.filterResults;
      if (!field) {
        return;
      }
      if (field === state.activeFilterField) {
        node.classList.add("is-open");
        node.innerHTML = renderFilterOptionsMarkup(field);
        bindDraftFilterToggleEvents(node);
      } else {
        node.classList.remove("is-open");
        node.innerHTML = "";
      }
    });
  }

  function renderFilterField(field) {
    const usesDedicatedMobileView = isCompactViewport();
    const selected = state.filterDrafts[field] || [];
    const options = usesDedicatedMobileView ? [] : getDraftFilterOptions(field, "");
    const isOpen = !usesDedicatedMobileView && state.activeFilterField === field;

    return `
      <div class="filter-group filter-modal-group">
        <div class="filter-line">
          <span class="filter-line-label ${escapeAttribute(getFilterFieldToneClass(field))}">
            ${field === "market" || field === "variety" ? `<img class="filter-line-icon" src="${escapeAttribute(getSuggestionIcon(field))}" alt="" aria-hidden="true">` : ""}
            <span>${escapeHtml(getFieldLabel(field))}</span>
          </span>
          <span class="line"></span>
        </div>
        <button
          type="button"
          class="filter-trigger filter-dropdown-trigger"
          data-filter-toggle="${field}"
          aria-expanded="${isOpen ? "true" : "false"}"
        >
          <span class="filter-trigger-copy">
            <span class="filter-trigger-label">${escapeHtml(getUiText("tap_to_select", "Tap to Select"))}</span>
            <span class="filter-trigger-value">${escapeHtml(summary)}</span>
          </span>
          <span class="filter-chevron ${isOpen ? "expanded" : ""}" aria-hidden="true"></span>
        </button>
        ${usesDedicatedMobileView ? "" : `
          <div class="option-list filter-search-results ${isOpen ? "is-open" : ""}" data-preserve-scroll-id="filter-search-results" data-filter-results="${field}" data-filter-field="${field}">
            ${isOpen ? (options.length ? renderFilterOptionsMarkup(field) : `<p class="filter-empty">${escapeHtml(getUiText("no_matching_options", "No matching options."))}</p>`) : ""}
          </div>
        `}
      </div>
    `;
  }

  function renderResults(rows) {
    if (!state.context) {
      return `
        <div class="empty-state empty-state-loading" aria-live="polite">
          <span class="search-state-spinner empty-state-spinner" aria-hidden="true"></span>
          <h3>${escapeHtml(getUiText("loading", "Loading..."))}</h3>
        </div>
      `;
    }

    if (!rows.length) {
      return `<div class="empty-state">${escapeHtml(getUiText("no_rows_match", "No rows match the current combination. The filter options stay constrained to valid combinations only, so clearing filters should broaden the result set."))}</div>`;
    }

    if (getActiveResultsLayout() === "table") {
      return renderResultsTable(rows);
    }

    return renderResultsCards(rows);
  }

  function renderResultsCards(rows) {
    return `
      <div class="results-list">
        ${rows.map((row) => renderResultCard(row)).join("")}
      </div>
    `;
  }

  function renderResultsTable(rows) {
    const columns = getTableColumns();
    return `
      <div class="results-table-wrap">
        <table class="results-table">
          <thead>
            <tr>
              ${renderResultsTableHeaderCells(columns)}
            </tr>
          </thead>
          <tbody>
            ${rows.map((row) => renderResultRow(row, columns)).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderStickyTableHeader(rows) {
    if (!rows.length) {
      return "";
    }

    const columns = getTableColumns();
    return `
      <div class="results-sticky-header" data-sticky-table-header="true" aria-hidden="true" hidden>
        <div class="results-sticky-header-viewport" data-sticky-table-header-viewport="true">
          <table class="results-table results-table-sticky" data-sticky-table-header-table="true">
            <thead>
              <tr>
                ${renderResultsTableHeaderCells(columns)}
              </tr>
            </thead>
          </table>
        </div>
      </div>
    `;
  }

  function renderResultsTableHeaderCells(columns) {
    return `
      ${columns.headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}
      ${columns.showArrivals ? `<th>${escapeHtml(getUiText("arrivals_units_header", "Arrivals & Units"))}</th>` : ""}
      ${columns.priceHeaders.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}
      <th>${escapeHtml(getUiText("latest_update", "Latest Update"))}</th>
      <th>${escapeHtml(getUiText("previous_update", "Previous Update"))}</th>
    `;
  }

  function getTableColumns() {
    const type = state.context ? state.context.type : "";
    const sampleRow = state.cachedVisibleRows[0] || state.baseRows[0] || null;
    const mode = getRowPriceMode(sampleRow);
    const showArrivals = sampleRow ? hasArrivalsData(sampleRow) : true;
    const priceHeaders = getPriceHeaders(sampleRow);
    const fixed = 2 + priceHeaders.length + (showArrivals ? 1 : 0);
    const includeVariety = state.context && state.context.filters.includes("variety");
    const includeGrade = rowsHaveValues(state.baseRows, "grade");

    if (type === "market") {
      const headers = [getUiText("field_commodity", "Commodity")];
      if (includeVariety) {
        headers.push(getUiText("field_variety", "Variety"));
      }
      if (includeGrade) {
        headers.push(getUiText("field_grade", "Grade"));
      }
      return {
        headers,
        showArrivals,
        mode,
        getCells: (row) => buildResultCells(
          row,
          [{ kind: "commodity", primary: true }],
          includeVariety,
          includeGrade
        ),
        count: headers.length + fixed,
        priceHeaders,
      };
    }

    if (type === "commodity") {
      const headers = [getUiText("field_market", "Market")];
      if (includeVariety) {
        headers.push(getUiText("field_variety", "Variety"));
      }
      if (includeGrade) {
        headers.push(getUiText("field_grade", "Grade"));
      }
      return {
        headers,
        showArrivals,
        mode,
        getCells: (row) => buildResultCells(
          row,
          [{ kind: "market", primary: true }],
          includeVariety,
          includeGrade
        ),
        count: headers.length + fixed,
        priceHeaders,
      };
    }

    if (type === "variety") {
      const headers = [getUiText("field_market", "Market")];
      if (includeGrade) {
        headers.push(getUiText("field_grade", "Grade"));
      }
      return {
        headers,
        showArrivals,
        mode,
        getCells: (row) => buildResultCells(
          row,
          [{ kind: "market", primary: true }],
          false,
          includeGrade
        ),
        count: headers.length + fixed,
        priceHeaders,
      };
    }

    const headers = [getUiText("field_market", "Market")];
    if (includeVariety) {
      headers.push(getUiText("field_variety", "Variety"));
    }
    if (includeGrade) {
      headers.push(getUiText("field_grade", "Grade"));
    }
    return {
      headers,
      showArrivals,
      mode,
      getCells: (row) => buildResultCells(
        row,
        [{ kind: "market", primary: true }],
        includeVariety,
        includeGrade
      ),
      count: headers.length + fixed,
      priceHeaders,
    };
  }

  function getCardPresentation(row) {
    const type = state.context ? state.context.type : "";

    if (type === "market") {
      return {
        titleKind: "commodity",
        titleLabel: getUiText("field_commodity", "Commodity"),
        titleValue: translateEntity("commodity", row.commodity),
        meta: buildMetaEntries([
          { label: getUiText("field_variety", "Variety"), value: translateEntity("variety", row.variety) },
          { label: getUiText("field_grade", "Grade"), value: row.grade },
        ]),
      };
    }

    if (type === "commodity") {
      if (isMarketSearchCommodityView()) {
        return {
          titleKind: "variety",
          titleValue: translateEntity("variety", row.variety),
          meta: buildMetaEntries([
            { label: getUiText("field_grade", "Grade"), value: row.grade },
          ]),
        };
      }

      return {
        titleKind: "market",
        titleLabel: getUiText("field_market", "Market"),
        titleValue: translateEntity("market", row.market),
        meta: buildMetaEntries([
          { label: getUiText("field_variety", "Variety"), value: translateEntity("variety", row.variety) },
          { label: getUiText("field_grade", "Grade"), value: row.grade },
        ]),
      };
    }

    if (type === "variety") {
      return {
        titleKind: "market",
        titleLabel: getUiText("field_market", "Market"),
        titleValue: translateEntity("market", row.market),
        meta: buildMetaEntries([
          { label: getUiText("field_variety", "Variety"), value: translateEntity("variety", row.variety) },
          { label: getUiText("field_grade", "Grade"), value: row.grade },
        ]),
      };
    }

    return {
      titleKind: "market",
      titleLabel: getUiText("field_market", "Market"),
      titleValue: translateEntity("market", row.market),
      meta: buildMetaEntries([
        { label: getUiText("field_commodity", "Commodity"), value: translateEntity("commodity", row.commodity) },
        { label: getUiText("field_variety", "Variety"), value: translateEntity("variety", row.variety) },
        { label: getUiText("field_grade", "Grade"), value: row.grade },
      ]),
    };
  }

  function renderResultCard(row) {
    const isExpanded = row.rowKey === state.expandedRowKey;
    const historyRows = isExpanded ? getHistoryRows(row) : [];
    const presentation = getCardPresentation(row);
    const priceMode = getRowPriceMode(row);
    const canonicalKey = getCanonicalPriceKey(row);
    const previousRow = getPreviousComparableRow(row);
    return `
      <article class="result-card ${isExpanded ? "is-expanded" : ""}" data-row-key="${escapeAttribute(row.rowKey)}">
        <div class="result-card-main">
          <section class="result-card-identity">
            <div class="result-card-title-row">
              <h3>${escapeHtml(presentation.titleValue)}</h3>
            </div>
            <div class="result-card-meta">
              ${presentation.meta.map((entry) => `
                <div class="result-meta-item">
                  <span class="result-meta-label">${escapeHtml(entry.label)}</span>
                  <span class="result-meta-value">${escapeHtml(entry.value)}</span>
                </div>
              `).join("")}
            </div>
          </section>

          <section class="result-card-prices">
            ${renderPriceSection(row, previousRow, priceMode, canonicalKey)}
          </section>

          <section class="result-card-details">
            ${hasArrivalsData(row) ? `
            <div class="result-detail-block result-detail-block-arrivals">
              <span class="result-detail-label">${escapeHtml(getUiText("arrivals_and_units", "Arrivals And Units"))}</span>
              <span class="result-detail-value">${escapeHtml(formatArrivalsUnits(row))}</span>
            </div>
            ` : ""}
            <div class="result-detail-block">
              <span class="result-detail-label">${escapeHtml(getUiText("price_updates", "Price Updates"))}</span>
              <div class="date-stack">
                <div class="date-stack-item">
                  <span class="date-stack-label">${escapeHtml(getUiText("latest", "Latest"))}</span>
                  <span>${escapeHtml(formatDateFull(row.reportDate))}</span>
                </div>
                <div class="date-stack-item">
                  <span class="date-stack-label">${escapeHtml(getUiText("previous", "Previous"))}</span>
                  <span>${escapeHtml(previousRow ? formatDateFull(previousRow.reportDate) : "-")}</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        <button type="button" class="result-card-toggle" data-toggle-history="${escapeAttribute(row.rowKey)}" aria-expanded="${isExpanded ? "true" : "false"}">
          <span class="result-card-toggle-label">${escapeHtml(getUiText("see_price_history", "See Price History"))}</span>
          <span class="result-card-toggle-chevron">${isExpanded ? "&#9652;" : "&#9662;"}</span>
        </button>

        ${isExpanded ? `
          <div class="result-card-history">
            ${renderHistory(row, historyRows)}
          </div>
        ` : ""}
      </article>
    `;
  }

  function renderResultRow(row, columns) {
    const isExpanded = row.rowKey === state.expandedRowKey;
    const historyRows = isExpanded ? getHistoryRows(row) : [];
    const priceMode = columns.mode || getRowPriceMode(row);
    const canonicalKey = getCanonicalPriceKey(row);
    const previousRow = getPreviousComparableRow(row);
    return `
      <tr class="result-row ${isExpanded ? "is-expanded" : ""}" data-toggle-history="${escapeAttribute(row.rowKey)}">
        ${columns.getCells(row).join("")}
        ${columns.showArrivals ? `<td>${escapeHtml(formatArrivalsUnits(row))}</td>` : ""}
        ${renderPriceColumns(row, previousRow, priceMode, canonicalKey)}
        <td>${escapeHtml(formatDateFull(row.reportDate))}</td>
        <td>${escapeHtml(previousRow ? formatDateFull(previousRow.reportDate) : "-")}</td>
      </tr>
      ${isExpanded ? `
        <tr class="result-row-chart">
          <td colspan="${columns.count}" class="result-row-chart-cell">
            <div class="result-card-history">
              ${renderHistory(row, historyRows)}
            </div>
          </td>
        </tr>
      ` : ""}
    `;
  }

  function renderPriceGroup(kind, label, value, delta) {
    return `
      <div class="result-price-group result-price-group-${escapeAttribute(kind)}">
        <span class="result-price-label">${escapeHtml(label)}</span>
        <div class="price-stack">
          <span class="price-value price-value-${escapeAttribute(kind)}">${formatCurrency(value)}</span>
          ${renderPriceDelta(delta)}
        </div>
      </div>
    `;
  }

  function getPreviousComparableRow(row) {
    return state.baseRows
      .filter((candidate) => {
        if (candidate.commodity !== row.commodity) return false;
        if (candidate.market !== row.market) return false;
        if (candidate.variety !== row.variety) return false;
        if (!isMarketSearchCommodityView() && candidate.sourceId !== row.sourceId) return false;
        if (!isMarketSearchCommodityView() && candidate.grade !== row.grade) return false;
        return candidate.reportDate < row.reportDate;
      })
      .reduce((best, candidate) => pickPreferredRepresentativeRow(best, candidate), null);
  }

  function getPreviousPriceDelta(row, priceKey, previousRow) {
    const comparableRow = previousRow || getPreviousComparableRow(row);

    if (!comparableRow) {
      return null;
    }

    if (row[priceKey] === null || row[priceKey] === undefined || row[priceKey] === ""
      || comparableRow[priceKey] === null || comparableRow[priceKey] === undefined || comparableRow[priceKey] === "") {
      return null;
    }

    return Number(row[priceKey]) - Number(comparableRow[priceKey]);
  }

  function renderPriceDelta(delta) {
    if (delta === null) {
      return `<span class="price-delta price-delta-flat">${escapeHtml(getUiText("no_earlier_update", "No earlier update"))}</span>`;
    }

    if (delta === 0) {
      return `
        <span class="price-delta price-delta-flat">
          <span class="delta-flat">-</span>
          <span>0</span>
        </span>
      `;
    }

    const isGain = delta > 0;
    return `
      <span class="price-delta ${isGain ? "price-delta-gain" : "price-delta-loss"}">
        ${renderDeltaIcon(isGain)}
        <span>${isGain ? "+" : "-"}${formatCurrency(Math.abs(delta))}</span>
      </span>
    `;
  }

  function renderDeltaIcon(isGain) {
    if (isGain) {
      return `
        <svg viewBox="0 0 16 16" aria-hidden="true" class="delta-icon">
          <polyline points="2,11 6,8 9,9 14,4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></polyline>
          <polyline points="10,4 14,4 14,8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></polyline>
        </svg>
      `;
    }

    return `
      <svg viewBox="0 0 16 16" aria-hidden="true" class="delta-icon">
        <polyline points="2,5 6,8 9,7 14,12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></polyline>
        <polyline points="10,12 14,12 14,8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></polyline>
      </svg>
    `;
  }

  function renderHistory(row, historyRows) {
    const activePoint = getActiveHistoryPoint(historyRows);
    return `
      <section class="history-card">
        <div class="chart-shell">
          <div class="history-layout">
            <div class="chart-summary-shell">
              ${renderChartSummary(activePoint, row)}
            </div>
            <div class="history-chart-panel">
              <p class="chart-scroll-note">${escapeHtml(getUiText("chart_scroll_note", "<-- Scroll horizontally to see all dates -->"))}</p>
              ${renderChartLegend()}
              ${renderChart(historyRows, activePoint, row.rowKey)}
            </div>
            <div class="axis-note">${escapeHtml(getTrendNote(row))}</div>
          </div>
        </div>
      </section>
    `;
  }

  function renderMarketJumpModal(rows) {
    if (!state.isMarketJumpOpen || !canRenderMarketJump(rows)) {
      return "";
    }

    const targets = getMarketJumpTargets(rows);
    return `
      <div class="screen-overlay market-jump-backdrop" data-close-market-jump="backdrop"></div>
      <section class="filter-dialog market-jump-dialog" role="dialog" aria-modal="true" aria-label="${escapeAttribute(getUiText("market_jump_title", "Jump to market"))}">
        <div class="dialog-header">
          <div>
            <h3>${escapeHtml(getUiText("market_jump_title", "Jump to market"))}</h3>
            <p class="filter-header-copy">${escapeHtml(getUiText("market_jump_copy", `Choose a market for ${translateEntity("commodity", state.route.commodity || "")}.`))}</p>
          </div>
          <button type="button" class="icon-button close" data-close-market-jump="button" aria-label="${escapeAttribute(getUiText("market_jump_close_aria", "Close market navigator"))}">
            <img src="${escapeAttribute(ASSETS.close)}" alt="" loading="lazy" decoding="async">
          </button>
        </div>
        <div class="market-jump-list">
          ${targets.map((target) => `
            <button type="button" class="market-jump-option" data-jump-market="${escapeAttribute(target.value)}">
              <span class="market-jump-option-icon" aria-hidden="true">
                <img src="${escapeAttribute(ASSETS.suggestionMarket)}" alt="" loading="lazy" decoding="async">
              </span>
              <span class="market-jump-option-copy">
                <span class="market-jump-option-label">${escapeHtml(target.label)}</span>
                <span>${escapeHtml(getUiText("market_jump_option_copy", "Open this market card"))}</span>
              </span>
            </button>
          `).join("")}
        </div>
      </section>
    `;
  }

  function renderChart(rows, activePoint, rowKey) {
    if (!rows.length) {
      return `<p class="muted">${escapeHtml(getUiText("no_historical_points", "No historical points are available inside the required time window."))}</p>`;
    }

    const isMobileViewport = window.innerWidth <= 767;
    const priceMode = getRowPriceMode(rows[0]);
    const chartMetricKeys = getChartMetricKeys(rows[0]);
    const canonicalKey = getCanonicalPriceKey(rows[0]);
    const axisWidth = 48;
    const chartRows = rows.map((row) => ({ ...row, isBaseline: false }));
    const width = isMobileViewport
      ? Math.max(460, 108 + (chartRows.length - 1) * 76)
      : Math.max(600, 120 + (chartRows.length - 1) * 96);
    const height = isMobileViewport ? 220 : 250;
    const paddingX = isMobileViewport ? 34 : 42;
    const paddingTop = 16;
    const paddingBottom = isMobileViewport ? 30 : 34;
    const values = chartRows.flatMap((entry) => {
      return chartMetricKeys
        .map((metric) => entry[metric.key])
        .filter((value) => value !== null && value !== undefined && value !== "");
    });
    const chartScale = buildChartScale(values);
    const xStep = (width - paddingX * 2) / Math.max(chartRows.length - 1, 1);

    const toX = (index) => paddingX + xStep * index;
    const toY = (value) => {
      const normalized = (value - chartScale.minTick) / (chartScale.maxTick - chartScale.minTick);
      return height - paddingBottom - normalized * (height - paddingTop - paddingBottom);
    };

    const latestActualDate = chartRows
      .filter((row) => !row.isCarriedForward)
      .reduce((latest, row) => row.reportDate > latest ? row.reportDate : latest, "");
    const lineSegments = renderChartLineSegments(
      chartRows,
      chartMetricKeys,
      toX,
      toY,
      latestActualDate
    );
    const activeIndex = chartRows.findIndex((row) => !row.isBaseline && row.reportDate === activePoint.reportDate);
    const activeX = toX(activeIndex);
    const labels = chartRows.map((row, index) => `
      <text x="${toX(index)}" y="${height - 12}" text-anchor="middle" fill="#5b6654" font-size="12">${row.isBaseline ? "" : escapeHtml(formatDateShort(row.reportDate))}</text>
    `).join("");

    const yAxisTicks = chartScale.ticks.map((tick) => {
      const y = toY(tick);
      return `
        <g>
          <line x1="${axisWidth - 8}" y1="${y}" x2="${axisWidth}" y2="${y}" stroke="#c2c8da" stroke-width="1.5" />
          <text x="${axisWidth - 6}" y="${y + 4}" text-anchor="end" fill="#5b6654" font-size="11">${escapeHtml(formatCurrency(tick))}</text>
        </g>
      `;
    }).join("");

    const gridLines = chartScale.ticks.map((tick) => {
      const y = toY(tick);
      return `<line x1="${paddingX}" y1="${y}" x2="${width - paddingX}" y2="${y}" stroke="${tick === 0 ? "#cfd5e3" : "#e8ebf3"}" stroke-width="${tick === 0 ? "1.6" : "1"}" />`;
    }).join("");

    const pointTargets = chartRows.map((row, index) => {
      const x = toX(index);
      const isActive = !row.isBaseline && row.reportDate === activePoint.reportDate;
      const pointTitle = row.isCarriedForward
        ? `${formatDateFull(row.reportDate)} - ${getUiText("carried_forward_from", "Carried forward from")} ${formatDateFull(row.sourceReportDate)}`
        : `${formatDateFull(row.reportDate)} - ${getUiText("actual_update", "Actual update")}`;
      return `
        <g${row.isBaseline ? "" : ` data-chart-date="${escapeAttribute(row.reportDate)}"`} class="chart-point-group ${isActive ? "is-active" : ""} ${row.isBaseline ? "is-baseline" : ""}">
          <title>${escapeHtml(pointTitle)}</title>
          <line x1="${x}" y1="${paddingTop}" x2="${x}" y2="${height - paddingBottom}" stroke="${isActive ? "#adb7d8" : "transparent"}" stroke-dasharray="5 5" />
          ${chartMetricKeys.map((metric) => row.isCarriedForward
            ? renderChartPointSquare(x, toY(row[metric.key]), metric.color, isActive)
            : renderChartPointCircle(x, toY(row[metric.key]), metric.color, isActive)).join("")}
          <rect x="${x - 20}" y="${paddingTop}" width="40" height="${height - paddingTop - paddingBottom}" fill="transparent" />
        </g>
      `;
    }).join("");

    return `
      <div class="chart-layout">
        <div class="chart-axis-y" aria-hidden="true">
          <svg viewBox="0 0 ${axisWidth} ${height}" width="${axisWidth}" height="${height}">
            <line x1="${axisWidth}" y1="${paddingTop}" x2="${axisWidth}" y2="${height - paddingBottom}" stroke="#d5d8e6" />
            <line x1="${axisWidth - 1}" y1="${height - paddingBottom}" x2="${axisWidth}" y2="${height - paddingBottom}" stroke="#cfd5e3" stroke-width="1.6" />
            ${yAxisTicks}
          </svg>
        </div>
        <div
          class="chart-scroll"
          data-preserve-scroll-id="chart-scroll"
          data-chart-row-key="${escapeAttribute(rowKey)}"
          data-chart-initial-position="right"
          data-chart-active-x="${activeX}"
          data-chart-x-step="${xStep}"
          data-chart-point-count="${chartRows.length}"
        >
          <svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${escapeAttribute(getUiText("price_history_aria", "Price history"))}" data-chart-root="true">
            ${gridLines}
            ${lineSegments}
            ${pointTargets}
            ${labels}
          </svg>
        </div>
      </div>
    `;
  }

  function renderChartSummary(activePoint, row) {
    if (!activePoint) {
      return "";
    }

    const profile = getRowPriceProfile(row);
    const sourceNote = activePoint.isCarriedForward
      ? `<span class="chart-summary-source">${escapeHtml(getUiText("carried_forward_from", "Carried forward from"))} ${escapeHtml(formatDateFull(activePoint.sourceReportDate))}</span>`
      : `<span class="chart-summary-source is-actual">${escapeHtml(getUiText("actual_update", "Actual update"))}</span>`;

    return `
      <div class="chart-summary">
        <div class="chart-summary-date">
          <div class="chart-summary-date-copy">
            <span class="chart-summary-date-label">${escapeHtml(getUiText("selected_date", "Selected Date"))}</span>
            ${sourceNote}
          </div>
          <strong class="chart-summary-date-value">${escapeHtml(formatDateFull(activePoint.reportDate))}</strong>
        </div>
        <div class="chart-summary-metrics">
          ${profile.columns.map((column) => `
            <span class="chart-metric chart-metric-${escapeAttribute(column.kind)} chart-metric-slot-${escapeAttribute(column.kind)}">
              <span class="chart-metric-label" title="${escapeAttribute(column.label)}"><span class="chart-metric-line chart-metric-line-${escapeAttribute(column.kind)}"></span><span class="chart-metric-label-text">${escapeHtml(getChartSummaryMetricLabel(column, profile.mode))}</span></span>
              <span class="chart-metric-value">${formatCurrency(activePoint[column.key])}</span>
            </span>
          `).join("")}
        </div>
      </div>
    `;
  }

  function getChartSummaryMetricLabel(column, profileMode) {
    if (profileMode === "single") {
      return column.label;
    }

    if (column.kind === "max") {
      return getUiText("max_short", "Max");
    }

    if (column.kind === "min") {
      return getUiText("min_short", "Min");
    }

    return getUiText("modal_short", "Modal");
  }

  function renderChartPointCircle(x, y, color, isActive) {
    return `<circle cx="${x}" cy="${y}" r="${isActive ? 6.5 : 5.25}" fill="${isActive ? color : "#fffaf6"}" stroke="${color}" stroke-width="2.25" />`;
  }

  function renderChartLineSegments(rows, metrics, toX, toY, latestActualDate) {
    return rows.slice(0, -1).map((leftRow, index) => {
      const rightRow = rows[index + 1];
      const x1 = toX(index);
      const x2 = toX(index + 1);
      const segmentGroups = getChartSegmentMetricGroups(leftRow, rightRow, metrics);
      const isTrailingCarrySegment = Boolean(
        latestActualDate
        && rightRow.isCarriedForward
        && leftRow.reportDate >= latestActualDate
      );

      return segmentGroups.map((group) => {
        const y1 = toY(leftRow[group[0].key]);
        const y2 = toY(rightRow[group[0].key]);

        if (group.length === 1) {
          return renderChartSegmentPath(
            x1,
            y1,
            x2,
            y2,
            group[0].color,
            group[0].strokeWidth,
            isTrailingCarrySegment
          );
        }

        return isTrailingCarrySegment
          ? renderChartColoredDottedSegment(x1, y1, x2, y2, group)
          : renderChartColoredBlockSegment(x1, y1, x2, y2, group);
      }).join("");
    }).join("");
  }

  function getChartSegmentMetricGroups(leftRow, rightRow, metrics) {
    const grouped = new Map();

    metrics.forEach((metric) => {
      const leftValue = getComparableChartValue(leftRow[metric.key]);
      const rightValue = getComparableChartValue(rightRow[metric.key]);
      if (leftValue === null || rightValue === null) {
        return;
      }

      const groupKey = `${leftValue}|${rightValue}`;
      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, []);
      }
      grouped.get(groupKey).push(metric);
    });

    const groups = [...grouped.values()].filter((group) => group.length > 1);
    const singles = [];
    metrics.forEach((metric) => {
      const isGrouped = groups.some((group) => group.includes(metric));
      if (!isGrouped) {
        singles.push([metric]);
      }
    });

    return [...groups, ...singles];
  }

  function getComparableChartValue(value) {
    if (value === null || value === undefined || value === "") {
      return null;
    }

    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
  }

  function renderChartSegmentPath(x1, y1, x2, y2, color, strokeWidth, isDotted) {
    return `
      <path
        d="M ${x1} ${y1} L ${x2} ${y2}"
        fill="none"
        stroke="${color}"
        stroke-width="${strokeWidth}"
        stroke-linecap="round"
        ${isDotted ? 'stroke-dasharray="8 8"' : ""}
      />
    `;
  }

  function renderChartColoredBlockSegment(x1, y1, x2, y2, metrics) {
    return renderChartColoredSubsegments(x1, y1, x2, y2, metrics, 10, false);
  }

  function renderChartColoredDottedSegment(x1, y1, x2, y2, metrics) {
    return renderChartColoredSubsegments(x1, y1, x2, y2, metrics, 8, true);
  }

  function renderChartColoredSubsegments(x1, y1, x2, y2, metrics, subsegmentLength, includeGaps) {
    const distance = Math.hypot(x2 - x1, y2 - y1);
    const interval = includeGaps ? subsegmentLength * 2 : subsegmentLength;
    const output = [];

    for (let offset = 0, segmentIndex = 0; offset < distance; offset += interval, segmentIndex += 1) {
      const visibleLength = Math.min(subsegmentLength, distance - offset);
      const startRatio = offset / distance;
      const endRatio = (offset + visibleLength) / distance;
      const startX = x1 + (x2 - x1) * startRatio;
      const startY = y1 + (y2 - y1) * startRatio;
      const endX = x1 + (x2 - x1) * endRatio;
      const endY = y1 + (y2 - y1) * endRatio;
      const metric = metrics[segmentIndex % metrics.length];

      output.push(`
        <path
          d="M ${startX} ${startY} L ${endX} ${endY}"
          fill="none"
          stroke="${metric.color}"
          stroke-width="${metric.strokeWidth}"
          stroke-linecap="${includeGaps ? "round" : "butt"}"
        />
      `);
    }

    return output.join("");
  }

  function renderChartPointSquare(x, y, color, isActive) {
    const size = isActive ? 5.5 : 4.5;
    const fill = isActive ? color : "#fffaf6";
    const strokeWidth = isActive ? 2.25 : 1.75;
    return `<rect x="${x - size}" y="${y - size}" width="${size * 2}" height="${size * 2}" rx="1.5" fill="${fill}" stroke="${color}" stroke-width="${strokeWidth}" />`;
  }

  function renderChartLegend() {
    return `
      <div class="chart-legend" aria-label="${escapeAttribute(getUiText("chart_legend_aria", "Price history point and line types"))}">
        <span class="chart-legend-item">
          <span class="chart-legend-marker chart-legend-marker-actual" aria-hidden="true"></span>
          <span>${escapeHtml(getUiText("actual_update", "Actual update"))}</span>
        </span>
        <span class="chart-legend-item">
          <span class="chart-legend-marker chart-legend-marker-carried" aria-hidden="true"></span>
          <span>${escapeHtml(getUiText("carried_forward", "Carried-forward price"))}</span>
        </span>
      </div>
    `;
  }

  function buildChartScale(values) {
    const maxValue = Math.max(...values, 0);
    const minValue = Math.min(...values, maxValue);
    const tickCount = 4;
    const rawStep = (maxValue - minValue) / tickCount || maxValue / tickCount || 1;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const normalized = rawStep / magnitude;
    let niceNormalized = 1;

    if (normalized > 5) {
      niceNormalized = 10;
    } else if (normalized > 2) {
      niceNormalized = 5;
    } else if (normalized > 1) {
      niceNormalized = 2;
    }

    const step = Math.max(1, niceNormalized * magnitude);
    const minTick = Math.max(0, Math.floor(minValue / step) * step);
    const maxTick = Math.max(minTick + step, Math.ceil(maxValue / step) * step);
    const ticks = [];
    for (let tick = minTick; tick <= maxTick; tick += step) {
      ticks.push(tick);
    }

    if (ticks[ticks.length - 1] !== maxTick) {
      ticks.push(maxTick);
    }

    return { step, minTick, maxTick, ticks };
  }

  function getActiveHistoryPoint(rows) {
    if (!rows.length) {
      return null;
    }

    const matched = rows.find((row) => row.reportDate === state.activeChartDate);
    if (matched) {
      return matched;
    }

    const actualRows = rows.filter((row) => !row.isCarriedForward);
    return actualRows[actualRows.length - 1] || rows[rows.length - 1];
  }

  function buildLinePath(points) {
    return points.map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x} ${y}`).join(" ");
  }

  function bindEvents() {
    document.querySelectorAll("[data-home-link]").forEach((homeLink) => {
      const handleHomeLink = (event) => {
        if (
          event.defaultPrevented
          || (typeof event.button === "number" && event.button !== 0)
          || event.metaKey
          || event.ctrlKey
          || event.shiftKey
          || event.altKey
        ) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        handleHomeClick();
      };

      homeLink.addEventListener("click", handleHomeLink);
    });

    document.querySelectorAll("[data-global-search]").forEach((input) => {
      input.addEventListener("input", handleSearchInput);
    });

    document.querySelectorAll("[data-search-entry]").forEach((input) => {
      input.addEventListener("focus", () => {
        if (input.dataset.searchEntry !== "overlay") {
          openSearchPanel();
        }
      });
    });

    document.querySelectorAll("[data-open-search]").forEach((button) => {
      button.addEventListener("click", openSearchPanel);
    });

    document.querySelectorAll("[data-close-search]").forEach((button) => {
      button.addEventListener("click", closeSearchPanel);
    });

    document.querySelectorAll("[data-clear-search]").forEach((button) => {
      button.addEventListener("click", clearSearchAndClose);
    });

    bindSearchStateEvents();

    document.querySelectorAll("[data-locale-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        setLocale(button.dataset.localeToggle);
      });
    });

    document.querySelectorAll("[data-home-category]").forEach((button) => {
      button.addEventListener("click", () => {
        handleHomeCategorySelect(button.dataset.homeCategory);
      });
    });

    document.querySelectorAll("[data-home-commodity]").forEach((button) => {
      button.addEventListener("click", () => {
        handleHomeCommoditySelect(button.dataset.homeCommodity);
      });
    });

    document.querySelectorAll("[data-results-layout]").forEach((button) => {
      button.addEventListener("click", () => {
        setResultsLayout(button.dataset.resultsLayout);
      });
    });

    bindSuggestionEvents();

    document.querySelectorAll("[data-open-filter-modal]").forEach((button) => {
      button.addEventListener("click", openFilterModal);
    });

    document.querySelectorAll("[data-open-market-jump]").forEach((button) => {
      button.addEventListener("click", openMarketJump);
    });

    document.querySelectorAll("[data-back-to-top]").forEach((button) => {
      button.addEventListener("click", () => {
        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      });
    });

    document.querySelectorAll("[data-close-filter-modal]").forEach((node) => {
      node.addEventListener("click", (event) => {
        const mode = node.dataset.closeFilterModal;
        if (mode === "backdrop" && event.target !== node) {
          return;
        }
        closeFilterModal();
      });
    });

    document.querySelectorAll("[data-close-market-jump]").forEach((node) => {
      node.addEventListener("click", (event) => {
        const mode = node.dataset.closeMarketJump;
        if (mode === "backdrop" && event.target !== node) {
          return;
        }
        closeMarketJump();
      });
    });

    document.querySelectorAll("[data-jump-market]").forEach((button) => {
      button.addEventListener("click", () => {
        jumpToMarketCard(button.dataset.jumpMarket);
      });
    });

    document.querySelectorAll("[data-filter-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        activateFilterField(button.dataset.filterToggle);
      });
    });

    bindDraftFilterToggleEvents(document);

    document.querySelectorAll("[data-remove-draft-filter]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        removeDraftFilterValue(button.dataset.removeDraftFilter, button.dataset.removeDraftValue);
      });
    });

    document.querySelectorAll("[data-remove-active-filter]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        removeAppliedFilterValue(
          button.dataset.removeActiveFilter,
          button.dataset.removeActiveValue
        );
      });
    });

    document.querySelectorAll("[data-apply-filter-drafts]").forEach((button) => {
      button.addEventListener("click", applyFilterDrafts);
    });

    document.querySelectorAll("[data-clear-filter-drafts]").forEach((button) => {
      button.addEventListener("click", clearFilterDrafts);
    });

    document.querySelectorAll("[data-share-card]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const row = getRowsForCurrentView().find((candidate) => candidate.rowKey === button.dataset.shareCard);
        if (row) {
          shareResultCard(row);
        }
      });
    });

    document.querySelectorAll("[data-toggle-history]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const key = button.dataset.toggleHistory;
        if (state.expandedRowKey === key) {
          state.expandedRowKey = null;
          state.activeChartDate = null;
          state.shouldPrimeExpandedHistory = false;
        } else {
          state.expandedRowKey = key;
          state.activeChartDate = null;
          state.shouldPrimeExpandedHistory = getActiveResultsLayout() === "table";
        }
        render();
      });
    });

    document.querySelectorAll("[data-chart-date]").forEach((node) => {
      const activate = (event) => {
        event.stopPropagation();
        setActiveChartDate(node.dataset.chartDate);
      };

      node.addEventListener("mouseenter", activate);
      node.addEventListener("click", activate);
    });

    document.querySelectorAll("[data-chart-root]").forEach((svg) => {
      svg.addEventListener("mouseleave", () => {
        state.activeChartDate = null;
        render();
      });
    });

  }

  function bindSuggestionEvents() {
    document.querySelectorAll("[data-suggestion-index]").forEach((button) => {
      if (button.dataset.boundSuggestionClick === "true") {
        return;
      }

      button.dataset.boundSuggestionClick = "true";
      button.addEventListener("click", () => {
        const result = state.suggestions[Number(button.dataset.suggestionIndex)];
        if (result) {
          handleSuggestionSelect(result);
        }
      });
    });
  }

  function bindSearchStateEvents() {
    document.querySelectorAll("[data-retry-search-index]").forEach((button) => {
      if (button.dataset.boundRetrySearchIndex === "true") {
        return;
      }

      button.dataset.boundRetrySearchIndex = "true";
      button.addEventListener("click", retrySearchIndex);
    });
  }

  function bindDraftFilterToggleEvents(root) {
    root.querySelectorAll("[data-toggle-draft-filter]").forEach((button) => {
      if (button.dataset.boundToggleDraftFilter === "true") {
        return;
      }

      button.dataset.boundToggleDraftFilter = "true";
      button.addEventListener("click", () => {
        toggleDraftFilterValue(button.dataset.toggleDraftFilter, button.dataset.toggleDraftValue);
      });
    });
  }

  function setupVisualViewportTracking() {
    updateVisualViewportHeight();
    syncExpandedHistoryLayout();

    if (!window.visualViewport) {
      window.addEventListener("resize", () => {
        updateVisualViewportHeight();
        updateTableWrapHeight();
        syncExpandedHistoryLayout();
      });
      return;
    }

    window.visualViewport.addEventListener("resize", handleVisualViewportChange);
    window.visualViewport.addEventListener("scroll", handleVisualViewportChange);
    window.addEventListener("resize", () => {
      updateVisualViewportHeight();
      updateTableWrapHeight();
      syncExpandedHistoryLayout();
    });
  }

  function handleVisualViewportChange() {
    updateVisualViewportHeight();
    updateTableWrapHeight();
    syncExpandedHistoryLayout();

    if (!state.isFilterModalOpen) {
      return;
    }

    const activeInput = document.activeElement;
    if (activeInput && activeInput.matches("[data-filter-search]")) {
      scheduleFilterFieldIntoView(activeInput);
    }
  }

  function updateVisualViewportHeight() {
    const height = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    document.documentElement.style.setProperty("--visual-viewport-height", `${Math.round(height)}px`);
  }

  function scheduleFilterFieldIntoView(input) {
    if (!input) {
      return;
    }

    window.setTimeout(() => {
      const field = input.closest(".filter-modal-group");
      if (field) {
        field.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
    }, 80);
  }

  function primeTableArrivalUi() {
    state.shouldScrollTableIntoView = true;
    state.showFilterHint = true;
    clearFilterHintTimers();
  }

  function clearFilterHintTimers() {
    if (filterHintTimer !== null) {
      window.clearTimeout(filterHintTimer);
      filterHintTimer = null;
    }
    if (filterHintFinalizeTimer !== null) {
      window.clearTimeout(filterHintFinalizeTimer);
      filterHintFinalizeTimer = null;
    }
  }

  function runPostRenderEffects() {
    syncPageOverlayLock();
    syncTopbarVisibility();
    updateTableWrapHeight();
    syncFilterHintAnimation();
    syncBackToTopButton();
    syncHomeTopbarSearchTrigger();
    syncActiveHomeCategoryViewport();
    if (getActiveResultsLayout() === "table") {
      syncStickyTableHeader();
      primeExpandedHistoryScroll();
    }
    syncExpandedHistoryLayout();

    if (state.shouldScrollTableIntoView && state.route.view === "table" && state.context) {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      state.shouldScrollTableIntoView = false;
      updateTableWrapHeight();
    }

    syncCardTarget();

    if (state.isSearchOpen) {
      const searchInput = document.querySelector("[data-search-autofocus='true']");
      if (searchInput && document.activeElement !== searchInput) {
        searchInput.focus();
        const length = searchInput.value.length;
        searchInput.setSelectionRange(length, length);
      }
    }
  }

  async function loadSearchAliases() {
    try {
      const payload = await fetchJson(`./data/search-aliases.json?v=${APP_DATA_VERSION}`);
      state.searchAliases = normalizeSearchAliasesPayload(payload);
    } catch (error) {
      state.searchAliases = {
        commodities: {},
        varieties: {},
      };
    }

    state.cachedSearchCandidates = null;
    syncSearchResultsForQuery(state.query);
    if (state.isSearchOpen) {
      syncSearchSuggestionsUi();
    }
  }

  async function loadSearchTransliterations() {
    try {
      const payload = await fetchJson(`./data/search-transliterations.json?v=${APP_DATA_VERSION}`);
      state.searchTransliterations = normalizeSearchTransliterationsPayload(payload);
    } catch (error) {
      state.searchTransliterations = {
        commodities: {},
        varieties: {},
      };
    }

    state.cachedSearchCandidates = null;
    syncSearchResultsForQuery(state.query);
    if (state.isSearchOpen) {
      syncSearchSuggestionsUi();
    }
  }

  function syncCardTarget() {
    const targetKey = state.route.card;
    if (state.route.view !== "table" || !state.context || !targetKey || state.cardTargetAppliedKey === targetKey) {
      return;
    }

    const target = [...document.querySelectorAll("[data-row-key]")]
      .find((node) => node.dataset.rowKey === targetKey);
    state.cardTargetAppliedKey = targetKey;
    if (!target) {
      return;
    }

    window.requestAnimationFrame(() => {
      if (state.route.card !== targetKey || !document.body.contains(target)) {
        return;
      }

      const topbar = document.querySelector(".topbar");
      const toolbar = document.querySelector(".results-toolbar");
      const topInset = Math.ceil((topbar ? topbar.getBoundingClientRect().height : 0)
        + (toolbar ? toolbar.getBoundingClientRect().height : 0) + 12);
      const targetTop = target.getBoundingClientRect().top + window.scrollY - topInset;

      window.scrollTo({
        top: Math.max(0, targetTop),
        left: 0,
        behavior: "smooth",
      });
      target.classList.add("card-target-highlight");
      if (cardTargetHighlightTimer !== null) {
        window.clearTimeout(cardTargetHighlightTimer);
      }
      cardTargetHighlightTimer = window.setTimeout(() => {
        target.classList.remove("card-target-highlight");
        cardTargetHighlightTimer = null;
      }, CARD_TARGET_HIGHLIGHT_DURATION_MS);
    });
  }

  function syncPageOverlayLock() {
    if (state.isFilterModalOpen || state.isMarketJumpOpen || state.isSearchOpen) {
      if (lockedBodyScrollY === null) {
        lockedBodyScrollY = window.scrollY;
      }
      document.body.classList.add("page-overlay-open");
      document.body.style.top = `-${lockedBodyScrollY}px`;
      return;
    }

    document.body.classList.remove("page-overlay-open");
    document.body.style.top = "";
    if (lockedBodyScrollY !== null) {
      window.scrollTo(window.scrollX, lockedBodyScrollY);
      lockedBodyScrollY = null;
    }
  }

  function syncTopbarVisibility() {
    if (topbarVisibilityCleanup) {
      topbarVisibilityCleanup();
      topbarVisibilityCleanup = null;
    }

    const topbar = document.querySelector(".topbar");
    const siteShell = document.querySelector(".site-shell");
    if (!topbar || !siteShell) {
      if (!state.isTopbarVisible) {
        state.isTopbarVisible = true;
      }
      return;
    }

    let frameId = null;
    let previousScrollY = Math.max(0, window.scrollY || document.documentElement.scrollTop || 0);
    let visibilityHoldUntil = 0;

    const applyVisibility = (isVisible) => {
      topbar.classList.toggle("topbar-hidden", !isVisible);
      siteShell.classList.toggle("topbar-collapsed", !isVisible);
      state.isTopbarVisible = isVisible;
      visibilityHoldUntil = performance.now() + 280;
    };

    const syncVisibility = () => {
      frameId = null;
      const currentScrollY = Math.max(0, window.scrollY || document.documentElement.scrollTop || 0);
      const delta = currentScrollY - previousScrollY;
      const threshold = 10;
      const revealThreshold = topbar.offsetHeight + 12;

      if (performance.now() < visibilityHoldUntil) {
        previousScrollY = currentScrollY;
        return;
      }

      let nextVisible = state.isTopbarVisible;

      if (state.isSearchOpen || state.isFilterModalOpen || currentScrollY <= revealThreshold) {
        nextVisible = true;
      } else if (delta >= threshold) {
        nextVisible = false;
      } else if (delta <= -threshold) {
        nextVisible = true;
      }

      previousScrollY = currentScrollY;

      if (state.isTopbarVisible !== nextVisible) {
        applyVisibility(nextVisible);
      }
    };

    const scheduleSync = () => {
      if (frameId !== null) {
        return;
      }
      frameId = window.requestAnimationFrame(syncVisibility);
    };

    window.addEventListener("scroll", scheduleSync, { passive: true });
    window.addEventListener("resize", scheduleSync);

    if (window.visualViewport) {
      window.visualViewport.addEventListener("scroll", scheduleSync, { passive: true });
      window.visualViewport.addEventListener("resize", scheduleSync);
    }

    scheduleSync();

    topbarVisibilityCleanup = () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
        frameId = null;
      }

      window.removeEventListener("scroll", scheduleSync);
      window.removeEventListener("resize", scheduleSync);

      if (window.visualViewport) {
        window.visualViewport.removeEventListener("scroll", scheduleSync);
        window.visualViewport.removeEventListener("resize", scheduleSync);
      }
    };
  }

  function syncHomeTopbarSearchTrigger() {
    if (homeTopbarSearchCleanup) {
      homeTopbarSearchCleanup();
      homeTopbarSearchCleanup = null;
    }

    if (state.route.view !== "home") {
      if (state.showHomeTopbarSearch) {
        state.showHomeTopbarSearch = false;
      }
      return;
    }

    const topbar = document.querySelector(".topbar");
    const heroSearch = document.querySelector(".hero-copy > .search-field");
    if (!topbar || !heroSearch) {
      if (state.showHomeTopbarSearch) {
        state.showHomeTopbarSearch = false;
      }
      return;
    }

    let frameId = null;

    const syncVisibility = () => {
      frameId = null;
      const topbarBottom = topbar.getBoundingClientRect().bottom;
      const heroSearchBottom = heroSearch.getBoundingClientRect().bottom;
      const shouldShow = heroSearchBottom <= topbarBottom;

      if (state.showHomeTopbarSearch !== shouldShow) {
        state.showHomeTopbarSearch = shouldShow;
        scheduleRender();
      }
    };

    const scheduleSync = () => {
      if (frameId !== null) {
        return;
      }
      frameId = window.requestAnimationFrame(syncVisibility);
    };

    window.addEventListener("scroll", scheduleSync, { passive: true });
    window.addEventListener("resize", scheduleSync);

    if (window.visualViewport) {
      window.visualViewport.addEventListener("scroll", scheduleSync, { passive: true });
      window.visualViewport.addEventListener("resize", scheduleSync);
    }

    scheduleSync();

    homeTopbarSearchCleanup = () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
        frameId = null;
      }

      window.removeEventListener("scroll", scheduleSync);
      window.removeEventListener("resize", scheduleSync);

      if (window.visualViewport) {
        window.visualViewport.removeEventListener("scroll", scheduleSync);
        window.visualViewport.removeEventListener("resize", scheduleSync);
      }
    };
  }

  function syncActiveHomeCategoryViewport() {
    if (state.route.view !== "home" || !state.shouldRevealActiveHomeCategory) {
      return;
    }

    const activeCategory = document.querySelector("[data-home-category].is-active");
    if (activeCategory && typeof activeCategory.scrollIntoView === "function") {
      activeCategory.scrollIntoView({
        block: "nearest",
        inline: "nearest",
      });
    }

    state.shouldRevealActiveHomeCategory = false;
  }

  function syncFilterHintAnimation() {
    const button = document.querySelector("[data-open-filter-modal]");
    if (!button) {
      clearFilterHintTimers();
      return;
    }

    if (!state.showFilterHint) {
      button.classList.remove("is-expanded", "is-highlighted", "is-collapsing");
      clearFilterHintTimers();
      return;
    }

    button.classList.add("is-expanded", "is-highlighted");
    button.classList.remove("is-collapsing");

    if (filterHintTimer !== null || filterHintFinalizeTimer !== null) {
      return;
    }

    filterHintTimer = window.setTimeout(() => {
      const liveButton = document.querySelector("[data-open-filter-modal]");
      if (liveButton) {
        liveButton.classList.remove("is-highlighted");
        liveButton.classList.add("is-collapsing");
        liveButton.classList.remove("is-expanded");
      }

      filterHintTimer = null;
      filterHintFinalizeTimer = window.setTimeout(() => {
        state.showFilterHint = false;
        filterHintFinalizeTimer = null;
        render();
      }, FILTER_HINT_COLLAPSE_MS);
    }, FILTER_HINT_DURATION_MS);
  }

  function updateTableWrapHeight() {
    const tableWrap = document.querySelector("[data-preserve-scroll-id='table-wrap']");
    if (!tableWrap) {
      return;
    }

    if (getActiveResultsLayout() === "table" || window.innerWidth > 767) {
      tableWrap.style.removeProperty("--table-wrap-height");
      return;
    }

    const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    const top = tableWrap.getBoundingClientRect().top;
    const available = Math.max(240, Math.floor(viewportHeight - top - 12));
    tableWrap.style.setProperty("--table-wrap-height", `${available}px`);
  }

  function syncBackToTopButton() {
    teardownBackToTopButton();

    const button = document.querySelector("[data-back-to-top]");
    const cards = document.querySelectorAll(".results-list .result-card");
    if (!button || cards.length < 5) {
      return;
    }

    const triggerCard = cards[4];
    let frameId = null;

    const syncVisibility = () => {
      frameId = null;
      const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      const triggerTop = triggerCard.getBoundingClientRect().top;
      const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
      const isVisible = scrollTop > 0 && triggerTop <= viewportHeight;

      button.classList.toggle("is-visible", isVisible);
      button.setAttribute("aria-hidden", isVisible ? "false" : "true");
      button.tabIndex = isVisible ? 0 : -1;
    };

    const scheduleSync = () => {
      if (frameId !== null) {
        return;
      }
      frameId = window.requestAnimationFrame(syncVisibility);
    };

    window.addEventListener("scroll", scheduleSync, { passive: true });
    window.addEventListener("resize", scheduleSync);

    if (window.visualViewport) {
      window.visualViewport.addEventListener("scroll", scheduleSync, { passive: true });
      window.visualViewport.addEventListener("resize", scheduleSync);
    }

    scheduleSync();

    backToTopButtonCleanup = () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
        frameId = null;
      }

      window.removeEventListener("scroll", scheduleSync);
      window.removeEventListener("resize", scheduleSync);

      if (window.visualViewport) {
        window.visualViewport.removeEventListener("scroll", scheduleSync);
        window.visualViewport.removeEventListener("resize", scheduleSync);
      }
    };
  }

  function primeExpandedHistoryScroll() {
    if (!state.shouldPrimeExpandedHistory || !state.expandedRowKey || getActiveResultsLayout() !== "table") {
      return;
    }

    const tableWrap = document.querySelector("[data-preserve-scroll-id='table-wrap']");
    const tableScroller = tableWrap ? tableWrap.querySelector(".results-table-wrap") : null;
    const chartScroll = document.querySelector("[data-preserve-scroll-id='chart-scroll']");

    window.requestAnimationFrame(() => {
      if (tableScroller) {
        tableScroller.scrollLeft = getAnchoredScrollLeft(tableScroller, 0.82, 120);
      }

      if (chartScroll && chartScroll.dataset.chartInitialPosition === "right") {
        chartScroll.scrollLeft = getChartAnchoredScrollLeft(chartScroll);
      }

      state.shouldPrimeExpandedHistory = false;
      syncExpandedHistoryLayout();
    });
  }

  function getAnchoredScrollLeft(scroller, anchorRatio, contextWidth) {
    if (!scroller) {
      return 0;
    }

    const maxScrollLeft = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    if (maxScrollLeft === 0) {
      return 0;
    }

    const desiredVisibleEnd = Math.max(scroller.clientWidth, scroller.scrollWidth - contextWidth);
    const target = desiredVisibleEnd - scroller.clientWidth * anchorRatio;
    return Math.max(0, Math.min(maxScrollLeft, Math.round(target)));
  }

  function getChartAnchoredScrollLeft(chartScroll) {
    if (!chartScroll) {
      return 0;
    }

    const maxScrollLeft = Math.max(0, chartScroll.scrollWidth - chartScroll.clientWidth);
    if (maxScrollLeft === 0) {
      return 0;
    }

    const activeX = Number(chartScroll.dataset.chartActiveX || 0);
    const xStep = Number(chartScroll.dataset.chartXStep || 0);
    const pointCount = Number(chartScroll.dataset.chartPointCount || 0);
    const anchorRatio = window.innerWidth <= 767 ? 0.8 : 0.84;
    const baseTarget = activeX - chartScroll.clientWidth * anchorRatio;
    const contextOffset = pointCount > 1 ? xStep * 1.2 : 0;
    const target = baseTarget - contextOffset;
    return Math.max(0, Math.min(maxScrollLeft, Math.round(target)));
  }

  function syncExpandedHistoryLayout() {
    const tableWrap = document.querySelector("[data-preserve-scroll-id='table-wrap']");
    const tableScroller = tableWrap ? tableWrap.querySelector(".results-table-wrap") : null;

    document.querySelectorAll(".history-layout").forEach((layout) => {
      const summaryShell = layout.querySelector(".chart-summary-shell");
      const chartPanel = layout.querySelector(".history-chart-panel");
      const chartSummary = summaryShell ? summaryShell.querySelector(".chart-summary") : null;

      if (!summaryShell || !chartPanel || !chartSummary) {
        return;
      }

      const availableWidth = tableScroller
        ? Math.floor(tableScroller.getBoundingClientRect().width)
        : Math.floor(layout.getBoundingClientRect().width);

      let layoutMode = "mobile";
      if (window.innerWidth > 767) {
        layoutMode = availableWidth >= 1180 ? "wide" : "compact";
      }

      layout.dataset.chartSummaryLayout = layoutMode;
      summaryShell.dataset.chartSummaryLayout = layoutMode;
      chartSummary.dataset.chartSummaryLayout = layoutMode;

      if (layoutMode === "mobile") {
        summaryShell.style.removeProperty("width");
        summaryShell.style.removeProperty("max-width");
      } else {
        summaryShell.style.removeProperty("width");
        summaryShell.style.removeProperty("max-width");
      }
    });
  }

  function syncStickyTableHeader() {
    teardownStickyTableHeader();

    const tableWrap = document.querySelector("[data-preserve-scroll-id='table-wrap']");
    const tableScroller = tableWrap ? tableWrap.querySelector(".results-table-wrap") : null;
    const table = tableWrap ? tableWrap.querySelector(".results-table") : null;
    const overlay = document.querySelector("[data-sticky-table-header='true']");
    const overlayTable = overlay ? overlay.querySelector("[data-sticky-table-header-table='true']") : null;

    if (!tableWrap || !tableScroller || !table || !overlay || !overlayTable) {
      return;
    }

    const liveHeaders = [...table.querySelectorAll("thead th")];
    const stickyHeaders = [...overlayTable.querySelectorAll("thead th")];

    if (!liveHeaders.length || liveHeaders.length !== stickyHeaders.length) {
      return;
    }

    let syncFrameId = 0;

    const scheduleSync = () => {
      if (syncFrameId) {
        return;
      }

      syncFrameId = window.requestAnimationFrame(() => {
        syncFrameId = 0;
        applyStickyTableHeaderLayout();
      });
    };

    const applyStickyTableHeaderLayout = () => {
      const tableRect = table.getBoundingClientRect();
      const headerRow = table.querySelector("thead tr");
      const wrapRect = tableScroller.getBoundingClientRect();

      if (!headerRow) {
        overlay.hidden = true;
        overlay.classList.remove("is-visible");
        return;
      }

      const headerRect = headerRow.getBoundingClientRect();
      const overlayHeight = Math.ceil(headerRect.height);
      const isVisible = headerRect.top <= 0
        && tableRect.bottom > overlayHeight
        && wrapRect.bottom > overlayHeight
        && wrapRect.width > 0;

      overlay.hidden = !isVisible;
      overlay.classList.toggle("is-visible", isVisible);

      if (!isVisible) {
        return;
      }

      overlay.style.left = `${Math.round(wrapRect.left)}px`;
      overlay.style.width = `${Math.round(wrapRect.width)}px`;
      overlay.style.top = "0px";

      const liveTableWidth = Math.ceil(table.getBoundingClientRect().width);
      overlayTable.style.width = `${liveTableWidth}px`;
      overlayTable.style.transform = `translateX(${-tableScroller.scrollLeft}px)`;

      liveHeaders.forEach((headerCell, index) => {
        const width = Math.ceil(headerCell.getBoundingClientRect().width);
        stickyHeaders[index].style.width = `${width}px`;
        stickyHeaders[index].style.minWidth = `${width}px`;
        stickyHeaders[index].style.maxWidth = `${width}px`;
      });
    };

    const handleScroll = () => {
      scheduleSync();
    };

    const handleResize = () => {
      scheduleSync();
    };

    tableScroller.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize);

    if (window.visualViewport) {
      window.visualViewport.addEventListener("scroll", handleScroll, { passive: true });
      window.visualViewport.addEventListener("resize", handleResize);
    }

    scheduleSync();

    stickyTableHeaderCleanup = () => {
      tableScroller.removeEventListener("scroll", handleScroll);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);

      if (window.visualViewport) {
        window.visualViewport.removeEventListener("scroll", handleScroll);
        window.visualViewport.removeEventListener("resize", handleResize);
      }

      if (syncFrameId) {
        window.cancelAnimationFrame(syncFrameId);
        syncFrameId = 0;
      }

      overlay.hidden = true;
      overlay.classList.remove("is-visible");
      overlay.removeAttribute("style");
      overlayTable.removeAttribute("style");
      stickyHeaders.forEach((cell) => {
        cell.style.removeProperty("width");
        cell.style.removeProperty("min-width");
        cell.style.removeProperty("max-width");
      });
    };
  }

  function teardownStickyTableHeader() {
    if (!stickyTableHeaderCleanup) {
      return;
    }

    stickyTableHeaderCleanup();
    stickyTableHeaderCleanup = null;
  }

  function teardownBackToTopButton() {
    if (!backToTopButtonCleanup) {
      return;
    }

    backToTopButtonCleanup();
    backToTopButtonCleanup = null;
  }

  function jumpToMarketCard(market) {
    state.isMarketJumpOpen = false;
    state.expandedRowKey = null;
    state.activeChartDate = null;
    state.shouldPrimeExpandedHistory = false;
    scheduleRender();

    window.requestAnimationFrame(() => {
      const target = document.querySelector(`[data-market-anchor="${escapeCssSelectorValue(market)}"]`);
      if (!target) {
        return;
      }

      const targetTop = target.getBoundingClientRect().top + window.scrollY - getMarketJumpScrollOffset();
      window.scrollTo({
        top: Math.max(0, targetTop),
        behavior: "smooth",
      });

      window.setTimeout(() => {
        highlightMarketJumpTarget(target);
      }, 260);
    });
  }

  function getMarketJumpScrollOffset() {
    const siteShell = document.querySelector(".site-shell");
    const topbar = document.querySelector(".topbar");
    const resultsToolbar = document.querySelector(".results-toolbar");
    const topbarHeight = siteShell && siteShell.classList.contains("topbar-collapsed")
      ? 0
      : (topbar ? topbar.getBoundingClientRect().height : 0);
    const toolbarHeight = resultsToolbar ? resultsToolbar.getBoundingClientRect().height : 0;
    return Math.ceil(topbarHeight + toolbarHeight + 12);
  }

  function escapeCssSelectorValue(value) {
    if (window.CSS && typeof window.CSS.escape === "function") {
      return window.CSS.escape(String(value));
    }

    return String(value)
      .replace(/\\/g, "\\\\")
      .replace(/"/g, "\\\"");
  }

  function highlightMarketJumpTarget(node) {
    document.querySelectorAll(".result-card.market-jump-highlight").forEach((card) => {
      card.classList.remove("market-jump-highlight");
    });

    if (marketJumpHighlightTimer !== null) {
      window.clearTimeout(marketJumpHighlightTimer);
      marketJumpHighlightTimer = null;
    }

    if (!node) {
      return;
    }

    node.classList.add("market-jump-highlight");
    marketJumpHighlightTimer = window.setTimeout(() => {
      node.classList.remove("market-jump-highlight");
      marketJumpHighlightTimer = null;
    }, MARKET_JUMP_HIGHLIGHT_DURATION_MS);
  }

  function highlightMatch(text, query) {
    if (!query.trim()) {
      return escapeHtml(text);
    }

    const lowerText = normalizeSearchText(text);
    const lowerQuery = normalizeSearchText(query);
    const index = lowerText.indexOf(lowerQuery);
    if (index === -1) {
      return escapeHtml(text);
    }

    const before = escapeHtml(text.slice(0, index));
    const match = escapeHtml(text.slice(index, index + query.length));
    const after = escapeHtml(text.slice(index + query.length));
    return `${before}<strong>${match}</strong>${after}`;
  }

  function formatCurrency(value) {
    if (value === null || value === undefined || value === "") {
      return "-";
    }
    return Number(value).toLocaleString("en-IN");
  }

  function formatNumber(value) {
    if (value === null || value === undefined || value === "") {
      return "-";
    }
    return Number(value).toLocaleString("en-IN");
  }

  function normalizeObservationRow(row) {
    return {
      ...row,
      reportDate: normalizeReportDateValue(row ? row.reportDate : ""),
    };
  }

  function normalizeReportDateValue(value) {
    const raw = String(value || "").trim();
    if (!raw) {
      return "";
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return raw;
    }

    let match = raw.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (match) {
      return `${match[3]}-${padDatePart(match[2])}-${padDatePart(match[1])}`;
    }

    match = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (match) {
      return `${match[3]}-${padDatePart(match[2])}-${padDatePart(match[1])}`;
    }

    match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
      return `${match[3]}-${padDatePart(match[2])}-${padDatePart(match[1])}`;
    }

    return raw;
  }

  function padDatePart(value) {
    return String(value || "").padStart(2, "0");
  }

  function getDisplayDateParts(value) {
    const normalized = normalizeReportDateValue(value);
    const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) {
      return null;
    }
    return {
      year: match[1],
      month: match[2],
      day: match[3],
    };
  }

  function formatDateShort(value) {
    const parts = getDisplayDateParts(value);
    if (!parts) {
      return String(value || "");
    }
    return `${parts.day}-${parts.month}`;
  }

  function formatDateFull(value) {
    const parts = getDisplayDateParts(value);
    if (!parts) {
      return String(value || "");
    }
    return `${parts.day}-${parts.month}-${parts.year}`;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function getAllLabel(field) {
    if (field === "variety") {
      return getUiText("all_varieties", "All varieties");
    }
    if (field === "commodity") {
      return getUiText("all_commodities", "All commodities");
    }
    if (field === "market") {
      return getUiText("all_markets", "All markets");
    }
    return `${getUiText("all_fallback_prefix", "All")} ${field}`;
  }

  function getUiText(key, fallback) {
    const entry = (state.translations.ui || {})[key];
    if (!entry) {
      return fallback || key;
    }
    if (state.locale === "kn" && entry.kn) {
      return entry.kn;
    }
    return entry.en || fallback || key;
  }

  function getSearchPlaceholderTerms() {
    const terms = getUiText("search_placeholder_terms", ["Tomato", "Local", "Mysuru mango"]);
    return Array.isArray(terms) && terms.length ? terms : ["Tomato", "Local", "Mysuru mango"];
  }

  function getFieldLabel(field) {
    return getUiText(`field_${field}`, capitalize(field));
  }

  function setLocale(locale) {
    if (locale !== "en" && locale !== "kn") {
      return;
    }

    state.locale = locale;
    storeLocale(locale);
    const trimmedQuery = state.query.trim();
    if (trimmedQuery.length >= SEARCH_MIN_QUERY_LENGTH && hasClientSearchIndex()) {
      state.suggestions = buildLocalizedSearchResults(trimmedQuery);
    }
    scheduleRender();
  }

  function scheduleSearchInputWork(query) {
    cancelSearchInputWork();

    const trimmedQuery = query.trim();
    if (!trimmedQuery || trimmedQuery.length < SEARCH_MIN_QUERY_LENGTH) {
      search(query);
      return;
    }

    searchInputTimer = window.setTimeout(() => {
      searchInputTimer = null;
      search(query);
    }, SEARCH_INPUT_DEBOUNCE_MS);
  }

  function cancelSearchInputWork() {
    if (searchInputTimer === null) {
      return;
    }

    window.clearTimeout(searchInputTimer);
    searchInputTimer = null;
  }

  function scheduleRender() {
    if (renderFrameId !== null) {
      return;
    }

    renderFrameId = window.requestAnimationFrame(() => {
      renderFrameId = null;
      render();
    });
  }

  function getIdleSearchUiState() {
    return state.searchIndexStatus === "error" ? "unavailable" : "idle";
  }

  function getSearchUiState() {
    return state.searchUiState || "idle";
  }

  function setPendingSearchUiState(query) {
    const trimmedQuery = query.trim();
    if (!trimmedQuery || trimmedQuery.length < SEARCH_MIN_QUERY_LENGTH) {
      state.suggestions = [];
      state.searchUiState = getIdleSearchUiState();
      return;
    }

    if (state.searchIndexStatus === "error") {
      state.suggestions = [];
      state.searchUiState = "unavailable";
      return;
    }

    state.searchUiState = "loading";
  }

  function syncSearchResultsForQuery(query) {
    const trimmedQuery = query.trim();
    if (!trimmedQuery || trimmedQuery.length < SEARCH_MIN_QUERY_LENGTH) {
      state.suggestions = [];
      state.searchUiState = getIdleSearchUiState();
      return;
    }

    if (state.searchIndexStatus === "error") {
      state.suggestions = [];
      state.searchUiState = "unavailable";
      return;
    }

    if (!hasClientSearchIndex()) {
      state.suggestions = [];
      state.searchUiState = "loading";
      return;
    }

    state.suggestions = buildLocalizedSearchResults(trimmedQuery);
    state.searchUiState = state.suggestions.length ? "ready" : "empty";
  }

  function invalidateDerivedDataCaches() {
    state.cachedVisibleRowsKey = "";
    state.cachedVisibleRows = [];
    state.cachedFilterOptions = {};
    state.cachedMarketCommodityLookup = null;
    state.cachedSearchCandidates = null;
  }

  function getMarketCommodityLookup() {
    if (state.cachedMarketCommodityLookup) {
      return state.cachedMarketCommodityLookup;
    }

    const lookup = new Map();
    state.allRows.forEach((row) => {
      if (!row.market || !row.commodity) {
        return;
      }

      let commodities = lookup.get(row.market);
      if (!commodities) {
        commodities = new Set();
        lookup.set(row.market, commodities);
      }

      commodities.add(row.commodity);
    });

    state.cachedMarketCommodityLookup = new Map(
      Array.from(lookup.entries()).map(([market, commodities]) => [market, Array.from(commodities)])
    );
    return state.cachedMarketCommodityLookup;
  }

  function buildVisibleRowsCacheKey() {
    if (!state.context) {
      return "";
    }

    return [
      state.route.type,
      state.route.commodity,
      state.route.market,
      state.route.variety,
      state.route.origin,
      state.baseRows.length,
      serializeFilters(state.filters),
    ].join("::");
  }

  function serializeFilters(filters) {
    return Object.keys(filters)
      .sort()
      .map((key) => `${key}:${(filters[key] || []).slice().sort().join("|")}`)
      .join(";");
  }

  function getStoredLocale() {
    try {
      const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
      return stored === "kn" ? "kn" : "en";
    } catch (error) {
      return "en";
    }
  }

  function storeLocale(locale) {
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch (error) {
      // Storage is optional for this feature.
    }
  }

  function translateEntity(field, value) {
    const translationGroup = getTranslationGroup(field);
    const entry = translationGroup[String(value)] || null;
    if (!entry) {
      return String(value);
    }

    if (state.locale === "kn" && entry.kn) {
      return entry.kn;
    }

    return entry.en || String(value);
  }

  function translateEntityWithLocale(field, value, locale) {
    const translationGroup = getTranslationGroup(field);
    const entry = translationGroup[String(value)] || null;
    if (!entry) {
      return String(value);
    }

    if (locale === "kn" && entry.kn) {
      return entry.kn;
    }

    return entry.en || String(value);
  }

  function getTranslationGroup(field) {
    if (field === "commodity") {
      return state.translations.commodities || {};
    }
    if (field === "market") {
      return state.translations.markets || {};
    }
    if (field === "variety") {
      return state.translations.varieties || {};
    }
    return {};
  }

  function hasClientSearchIndex() {
    return state.searchIndex.commodities.length > 0
      || state.searchIndex.markets.length > 0
      || state.searchIndex.varieties.length > 0;
  }

  function buildLocalizedSearchResults(query) {
    const normalizedQuery = normalizeSearchText(query);
    const queryTerms = getMeaningfulSearchQueryTerms(normalizedQuery);
    const effectiveQuery = queryTerms.join(" ") || normalizedQuery;
    const candidates = getLocalizedSearchCandidates();
    let commodityResults = candidates.commodities
      .map((candidate) => buildCommoditySearchResult(candidate, effectiveQuery))
      .filter(Boolean)
      .sort(compareLocalizedSearchResults)
      .slice(0, 6);

    const marketResults = buildMarketCommoditySearchResults(effectiveQuery, queryTerms);

    const varietyResults = candidates.varieties
      .map((candidate) => buildVarietySearchResult(candidate, effectiveQuery, queryTerms))
      .filter(Boolean)
      .sort(compareLocalizedSearchResults)
      .slice(0, 8);

    const hasCompositeResult = marketResults.some((result) => result.matchType === "market")
      || varietyResults.some((result) => result.matchType === "commodity-variety");
    if (queryTerms.length > 1 && !hasCompositeResult) {
      const existingCommodityNames = new Set(
        commodityResults.map((result) => normalizeSearchText(result.commodity || "")),
      );
      commodityResults = [
        ...commodityResults,
        ...buildCommodityFallbackSearchResults(candidates.commodities, queryTerms)
          .filter((result) => !existingCommodityNames.has(normalizeSearchText(result.commodity || ""))),
      ]
        .sort(compareLocalizedSearchResults)
        .slice(0, 6);
    }

    return [...commodityResults, ...marketResults, ...varietyResults].slice(0, 12);
  }

  function buildCommoditySearchResult(candidate, query) {
    const score = getLocalizedMatchScore(candidate.aliases, query);
    return score ? { type: "commodity", commodity: candidate.name, score } : null;
  }

  function buildCommodityFallbackSearchResults(candidates, queryTerms) {
    return candidates
      .map((candidate) => {
        const score = queryTerms.reduce((best, term) => {
          const termScore = getLocalizedMatchScore(candidate.aliases, term);
          if (!termScore || termScore.matchRank > 1) {
            return best;
          }
          return pickBetterMatchScore(termScore, best);
        }, null);
        return score
          ? { type: "commodity", commodity: candidate.name, matchType: "commodity-fallback", score }
          : null;
      })
      .filter(Boolean)
      .sort(compareLocalizedSearchResults);
  }

  function buildMarketCommoditySearchResults(query, queryTerms = getSearchQueryTerms(query)) {
    const marketCommodityLookup = getMarketCommodityLookup();
    const candidates = getLocalizedSearchCandidates();
    const results = candidates.markets.flatMap((marketCandidate) => {
      const marketResult = buildMarketSearchResult(marketCandidate, query);
      const isCompositeQuery = queryTerms.length > 1;
      if (!marketResult && !isCompositeQuery) {
        return [];
      }

      const commodities = marketCommodityLookup.get(marketCandidate.name) || [];
      if (!commodities.length) {
        return marketResult ? [marketResult] : [];
      }

      return commodities
        .map((commodity) => {
          const commodityCandidate = candidates.commodityByName.get(commodity);
          const score = marketResult
            ? marketResult.score
            : commodityCandidate
              ? getCompositeSearchMatchScore(
                marketCandidate.aliases,
                commodityCandidate.aliases,
                query,
                queryTerms
              )
              : null;

          if (!score) {
            return null;
          }

          return {
            type: "commodity",
            commodity,
            market: marketCandidate.name,
            matchType: "market",
            score,
          };
        })
        .filter(Boolean);
    });

    return results
      .sort(compareLocalizedSearchResults)
      .slice(0, 8);
  }

  function buildMarketSearchResult(candidate, query) {
    const score = getLocalizedMatchScore(candidate.aliases, query);
    return score ? { type: "market", market: candidate.name, score } : null;
  }

  function buildVarietySearchResult(candidate, query, queryTerms) {
    const directScore = getLocalizedMatchScore(
      [...candidate.varietyAliases, ...candidate.commodityAliases],
      query
    );
    const compositeScore = queryTerms.length > 1
      ? getCompositeSearchMatchScore(
        candidate.commodityAliases,
        candidate.varietyAliases,
        query,
        queryTerms
      )
      : null;
    const score = pickBetterMatchScore(compositeScore, directScore);
    return score ? {
      type: "variety",
      commodity: candidate.commodity,
      variety: candidate.variety,
      matchType: compositeScore && score === compositeScore ? "commodity-variety" : "variety",
      score,
    } : null;
  }

  function getSearchQueryTerms(query) {
    return normalizeSearchText(query)
      .split(/\s+/)
      .filter(Boolean);
  }

  function getMeaningfulSearchQueryTerms(query) {
    return getSearchQueryTerms(query)
      .filter((term) => !SEARCH_CONNECTIVE_WORDS.has(term));
  }

  function getLocalizedSearchCandidates() {
    if (state.cachedSearchCandidates) {
      return state.cachedSearchCandidates;
    }

    const commodityCandidates = state.searchIndex.commodities.map((name) => ({
      name,
      aliases: getSearchAliases("commodity", name),
    }));
    const marketCandidates = state.searchIndex.markets.map((name) => ({
      name,
      aliases: getSearchAliases("market", name),
    }));
    const varietyCandidates = state.searchIndex.varieties.map((item) => ({
      commodity: item.commodity,
      variety: item.variety,
      commodityAliases: getSearchAliases("commodity", item.commodity),
      varietyAliases: getSearchAliases("variety", item.variety, item.commodity),
    }));

    state.cachedSearchCandidates = {
      commodities: commodityCandidates,
      commodityByName: new Map(commodityCandidates.map((candidate) => [candidate.name, candidate])),
      markets: marketCandidates,
      varieties: varietyCandidates,
    };
    return state.cachedSearchCandidates;
  }

  function getSearchAliases(field, value, relatedValue = "") {
    const kannadaTranslation = translateEntityWithLocale(field, value, "kn");
    const curatedAliases = getCuratedSearchAliases(field, value, relatedValue);
    const generatedTransliteration = getGeneratedSearchTransliteration(field, value, relatedValue);
    const romanizedKannada = transliterateKannada(kannadaTranslation);
    return [...new Set([
      value,
      translateEntityWithLocale(field, value, "en"),
      kannadaTranslation,
      generatedTransliteration,
      romanizedKannada,
      ...curatedAliases,
    ].map(normalizeSearchText).filter(Boolean))];
  }

  function getCuratedSearchAliases(field, value, relatedValue = "") {
    const group = field === "commodity"
      ? state.searchAliases.commodities
      : field === "variety"
        ? state.searchAliases.varieties
        : {};
    const key = field === "variety"
      ? `${relatedValue}::${value}`
      : String(value);
    const aliases = group && Array.isArray(group[key]) ? group[key] : [];
    return aliases.filter((alias) => typeof alias === "string");
  }

  function normalizeSearchAliasesPayload(payload) {
    const source = payload && typeof payload === "object" && !Array.isArray(payload)
      ? payload
      : {};
    return {
      commodities: normalizeSearchAliasGroup(source.commodities),
      varieties: normalizeSearchAliasGroup(source.varieties),
    };
  }

  function normalizeSearchAliasGroup(group) {
    if (!group || typeof group !== "object" || Array.isArray(group)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(group)
        .filter(([, aliases]) => Array.isArray(aliases))
        .map(([key, aliases]) => [
          key,
          aliases.filter((alias) => typeof alias === "string"),
        ])
    );
  }

  function normalizeSearchTransliterationsPayload(payload) {
    const source = payload && typeof payload === "object" && !Array.isArray(payload)
      ? payload
      : {};
    return {
      commodities: normalizeSearchTransliterationGroup(source.commodities),
      varieties: normalizeSearchTransliterationGroup(source.varieties),
    };
  }

  function normalizeSearchTransliterationGroup(group) {
    if (!group || typeof group !== "object" || Array.isArray(group)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(group)
        .filter(([, alias]) => typeof alias === "string")
        .map(([key, alias]) => [key, normalizeSearchText(alias)])
        .filter(([, alias]) => Boolean(alias))
    );
  }

  function getGeneratedSearchTransliteration(field, value, relatedValue = "") {
    const group = field === "commodity"
      ? state.searchTransliterations.commodities
      : field === "variety"
        ? state.searchTransliterations.varieties
        : {};
    const key = field === "variety"
      ? `${relatedValue}::${value}`
      : String(value);
    return group && typeof group[key] === "string" ? group[key] : "";
  }

  const KANNADA_INDEPENDENT_VOWELS = {
    "ಅ": "a",
    "ಆ": "a",
    "ಇ": "i",
    "ಈ": "i",
    "ಉ": "u",
    "ಊ": "u",
    "ಋ": "ru",
    "ೠ": "ru",
    "ಎ": "e",
    "ಏ": "e",
    "ಐ": "ai",
    "ಒ": "o",
    "ಓ": "o",
    "ಔ": "au",
  };

  const KANNADA_CONSONANTS = {
    "ಕ": "k",
    "ಖ": "kh",
    "ಗ": "g",
    "ಘ": "gh",
    "ಙ": "ng",
    "ಚ": "ch",
    "ಛ": "chh",
    "ಜ": "j",
    "ಝ": "jh",
    "ಞ": "ny",
    "ಟ": "t",
    "ಠ": "th",
    "ಡ": "d",
    "ಢ": "dh",
    "ಣ": "n",
    "ತ": "t",
    "ಥ": "th",
    "ದ": "d",
    "ಧ": "dh",
    "ನ": "n",
    "ಪ": "p",
    "ಫ": "ph",
    "ಬ": "b",
    "ಭ": "bh",
    "ಮ": "m",
    "ಯ": "y",
    "ರ": "r",
    "ಲ": "l",
    "ವ": "v",
    "ಶ": "sh",
    "ಷ": "sh",
    "ಸ": "s",
    "ಹ": "h",
    "ಳ": "l",
  };

  const KANNADA_VOWEL_SIGNS = {
    "ಾ": "a",
    "ಿ": "i",
    "ೀ": "i",
    "ು": "u",
    "ೂ": "u",
    "ೃ": "ru",
    "ೆ": "e",
    "ೇ": "e",
    "ೈ": "ai",
    "ೊ": "o",
    "ೋ": "o",
    "ೌ": "au",
  };

  const KANNADA_ANUSVARA_GROUPS = {
    "ಕಖಗಘಙ": "n",
    "ಚಛಜಝಞ": "n",
    "ಟಠಡಢಣ": "n",
    "ತಥದಧನ": "n",
    "ಪಫಬಭಮ": "m",
  };

  function transliterateKannada(value) {
    const chars = Array.from(String(value || ""));
    if (!chars.some((char) => isKannadaCharacter(char))) {
      return "";
    }

    let result = "";
    for (let index = 0; index < chars.length; index += 1) {
      const char = chars[index];
      if (KANNADA_INDEPENDENT_VOWELS[char]) {
        result += KANNADA_INDEPENDENT_VOWELS[char];
        continue;
      }

      if (KANNADA_CONSONANTS[char]) {
        result += KANNADA_CONSONANTS[char];
        const nextChar = chars[index + 1];
        if (nextChar === "್") {
          index += 1;
        } else if (!KANNADA_VOWEL_SIGNS[nextChar]) {
          result += "a";
        }
        continue;
      }

      if (KANNADA_VOWEL_SIGNS[char]) {
        result += KANNADA_VOWEL_SIGNS[char];
        continue;
      }

      if (char === "ಂ") {
        result += getKannadaAnusvaraAlias(chars[index + 1]);
        continue;
      }

      if (char === "ಃ") {
        result += "h";
        continue;
      }

      if (char === "್" || char === "಼") {
        continue;
      }

      result += char;
    }

    return result
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function isKannadaCharacter(char) {
    if (!char) {
      return false;
    }
    const codePoint = char.codePointAt(0);
    return codePoint >= 0x0C80 && codePoint <= 0x0CFF;
  }

  function getKannadaAnusvaraAlias(nextChar) {
    const group = Object.entries(KANNADA_ANUSVARA_GROUPS)
      .find(([characters]) => characters.includes(nextChar));
    return group ? group[1] : "m";
  }

  function getCompositeSearchMatchScore(leftAliases, rightAliases, query, queryTerms = getSearchQueryTerms(query)) {
    if (queryTerms.length < 2) {
      return null;
    }

    const combinedAliases = [];
    leftAliases.forEach((leftAlias) => {
      rightAliases.forEach((rightAlias) => {
        combinedAliases.push(`${leftAlias} ${rightAlias}`);
        combinedAliases.push(`${rightAlias} ${leftAlias}`);
      });
    });

    const directScore = getLocalizedMatchScore(combinedAliases, query);
    const termMatches = queryTerms.map((term) => ({
      left: getBestTermMatchForAliases(term, leftAliases),
      right: getBestTermMatchForAliases(term, rightAliases),
    }));

    if (termMatches.some((match) => !match.left && !match.right)) {
      return null;
    }

    let bestAssignment = null;
    for (let leftIndex = 0; leftIndex < termMatches.length; leftIndex += 1) {
      for (let rightIndex = 0; rightIndex < termMatches.length; rightIndex += 1) {
        if (leftIndex === rightIndex || !termMatches[leftIndex].left || !termMatches[rightIndex].right) {
          continue;
        }

        const assignment = termMatches.map((match, index) => {
          if (index === leftIndex) {
            return match.left;
          }
          if (index === rightIndex) {
            return match.right;
          }
          return pickBetterTermMatch(match.left, match.right);
        });

        if (assignment.some((match) => !match)) {
          continue;
        }

        const score = {
          matchRank: assignment.some((match) => match.matchRank === 2) ? 2 : 1,
          fuzzyDistance: assignment.reduce((total, match) => total + match.distance, 0),
          fieldCoverage: 2,
          startsWith: Math.min(...assignment.map((match) => match.startsWith)),
          position: assignment.reduce((total, match) => total + match.position, 0),
          length: Math.min(...combinedAliases.map((alias) => alias.length)),
        };

        if (!bestAssignment || compareMatchScore(score, bestAssignment) < 0) {
          bestAssignment = score;
        }
      }
    }

    return pickBetterMatchScore(directScore, bestAssignment);
  }

  function getLocalizedMatchScore(candidates, query) {
    const normalizedQuery = normalizeSearchText(query);
    const queryTerms = getSearchQueryTerms(normalizedQuery);
    if (!normalizedQuery || !queryTerms.length) {
      return null;
    }

    return candidates.reduce((best, candidate) => {
      const score = getAliasMatchScore(normalizeSearchText(candidate), normalizedQuery, queryTerms);
      return pickBetterMatchScore(score, best);
    }, null);
  }

  function getAliasMatchScore(candidate, normalizedQuery, queryTerms) {
    const exactIndex = candidate.indexOf(normalizedQuery);
    if (exactIndex !== -1) {
      return {
        matchRank: candidate === normalizedQuery ? 0 : 1,
        fuzzyDistance: 0,
        fieldCoverage: 1,
        startsWith: exactIndex === 0 ? 0 : 1,
        position: exactIndex,
        length: candidate.length,
      };
    }

    const termMatches = queryTerms.map((term) => getBestTermMatch(term, candidate));
    if (termMatches.some((match) => !match)) {
      return null;
    }

    return {
      matchRank: termMatches.some((match) => match.matchRank === 2) ? 2 : 1,
      fuzzyDistance: termMatches.reduce((total, match) => total + match.distance, 0),
      fieldCoverage: 1,
      startsWith: Math.min(...termMatches.map((match) => match.startsWith)),
      position: termMatches.reduce((total, match) => total + match.position, 0),
      length: candidate.length,
    };
  }

  function getBestTermMatchForAliases(term, aliases) {
    return aliases.reduce((best, alias) => {
      return pickBetterTermMatch(getBestTermMatch(term, alias), best);
    }, null);
  }

  function getBestTermMatch(term, candidate) {
    const candidateParts = [...new Set([candidate, ...getSearchQueryTerms(candidate)])];
    return candidateParts.reduce((best, part) => {
      const exactIndex = part.indexOf(term);
      if (exactIndex !== -1) {
        const score = {
          matchRank: 0,
          distance: 0,
          startsWith: exactIndex === 0 ? 0 : 1,
          position: exactIndex,
          length: part.length,
        };
        return pickBetterTermMatch(score, best);
      }

      if (term.length < FUZZY_SEARCH_MIN_TERM_LENGTH || part.length < FUZZY_SEARCH_MIN_TERM_LENGTH) {
        return best;
      }

      const distance = getDamerauLevenshteinDistance(term, part);
      if (distance > getFuzzySearchMaxDistance(term.length)) {
        return best;
      }

      return pickBetterTermMatch({
        matchRank: 2,
        distance,
        startsWith: 1,
        position: 0,
        length: part.length,
      }, best);
    }, null);
  }

  function getFuzzySearchMaxDistance(termLength) {
    return termLength <= 5 ? 1 : 2;
  }

  function getDamerauLevenshteinDistance(left, right) {
    const matrix = Array.from({ length: left.length + 1 }, (_, row) => {
      return Array.from({ length: right.length + 1 }, (_, column) => row === 0 ? column : column === 0 ? row : 0);
    });

    for (let row = 1; row <= left.length; row += 1) {
      for (let column = 1; column <= right.length; column += 1) {
        const substitutionCost = left[row - 1] === right[column - 1] ? 0 : 1;
        matrix[row][column] = Math.min(
          matrix[row - 1][column] + 1,
          matrix[row][column - 1] + 1,
          matrix[row - 1][column - 1] + substitutionCost
        );

        if (row > 1 && column > 1
          && left[row - 1] === right[column - 2]
          && left[row - 2] === right[column - 1]) {
          matrix[row][column] = Math.min(matrix[row][column], matrix[row - 2][column - 2] + 1);
        }
      }
    }

    return matrix[left.length][right.length];
  }

  function pickBetterTermMatch(left, right) {
    if (!left) {
      return right;
    }
    if (!right) {
      return left;
    }
    return compareTermMatches(left, right) <= 0 ? left : right;
  }

  function compareTermMatches(left, right) {
    if (left.matchRank !== right.matchRank) {
      return left.matchRank - right.matchRank;
    }
    if (left.distance !== right.distance) {
      return left.distance - right.distance;
    }
    if (left.startsWith !== right.startsWith) {
      return left.startsWith - right.startsWith;
    }
    if (left.position !== right.position) {
      return left.position - right.position;
    }
    return left.length - right.length;
  }

  function pickBetterMatchScore(left, right) {
    if (!left) {
      return right;
    }
    if (!right) {
      return left;
    }
    return compareMatchScore(left, right) <= 0 ? left : right;
  }

  function compareLocalizedSearchResults(left, right) {
    const scoreCompare = compareMatchScore(left.score, right.score);
    if (scoreCompare !== 0) {
      return scoreCompare;
    }
    return getSuggestionLabel(left).localeCompare(getSuggestionLabel(right));
  }

  function compareMatchScore(left, right) {
    if ((left.matchRank ?? 0) !== (right.matchRank ?? 0)) {
      return (left.matchRank ?? 0) - (right.matchRank ?? 0);
    }
    if ((left.fuzzyDistance ?? left.distance ?? 0) !== (right.fuzzyDistance ?? right.distance ?? 0)) {
      return (left.fuzzyDistance ?? left.distance ?? 0) - (right.fuzzyDistance ?? right.distance ?? 0);
    }
    if ((right.fieldCoverage ?? 1) !== (left.fieldCoverage ?? 1)) {
      return (right.fieldCoverage ?? 1) - (left.fieldCoverage ?? 1);
    }
    if (left.startsWith !== right.startsWith) {
      return left.startsWith - right.startsWith;
    }
    if (left.position !== right.position) {
      return left.position - right.position;
    }
    return left.length - right.length;
  }

  function normalizeSearchText(value) {
    return String(value || "")
      .normalize("NFKC")
      .toLowerCase()
      .trim();
  }

  function escapeHtml(value) {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll("\"", "&quot;")
      .replaceAll("'", "&#39;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value);
  }

  function render() {
    document.documentElement.setAttribute("lang", state.locale === "kn" ? "kn" : "en");
    document.documentElement.setAttribute("data-locale", state.locale);
    const searchInputState = captureSearchInputState();
    const filterInputState = captureFilterInputState();
    const scrollState = captureScrollState();
    const rows = state.route.view === "table" && state.context ? getRowsForCurrentView() : [];
    teardownStickyTableHeader();

    app.innerHTML = `
      <div class="site-shell ${state.isTopbarVisible ? "" : "topbar-collapsed"}">
        <header class="topbar ${state.isTopbarVisible ? "" : "topbar-hidden"}">
          <div class="topbar-inner ${state.route.view === "home" ? "topbar-home" : "results-topbar-inner"}">
            ${renderTopBar()}
          </div>
        </header>

        ${state.route.view === "home" ? `
          <main class="page home-page">
            ${renderHomeHero()}
            ${renderCategorySection()}
          </main>
        ` : `
          <main class="page results-page">
            ${renderResultsToolbar(rows)}

            <section class="results-content-shell">
              ${renderMarketJumpLauncher(rows)}
              ${renderBackToTopButton(rows)}
              <div class="table-wrap" data-preserve-scroll-id="table-wrap">
                ${renderResults(rows)}
              </div>
            </section>
          </main>
        `}

        ${renderSiteFooter()}

        ${renderSearchOverlay()}
        ${renderFilterModal()}
        ${renderMarketJumpModal(rows)}
        ${renderShareFeedback()}
      </div>
    `;

    bindEvents();
    restoreSearchInputState(searchInputState);
    restoreFilterInputState(filterInputState);
    restoreScrollState(scrollState);
    runPostRenderEffects();
  }

  function renderHomeHero() {
    return `
      <section class="hero-block">
        <picture class="hero-bg-img">
          <source media="(min-width: 768px)" srcset="${escapeAttribute(ASSETS.heroBg)}">
          <img src="${escapeAttribute(ASSETS.heroBgMobile)}" alt="" fetchpriority="high" decoding="async">
        </picture>
        <div class="hero-copy ${state.isSearchOpen ? "search-active" : ""}">
          <h1 class="hero-logo-heading">${renderBrandHomeLink("hero-brand-link", ASSETS.heroLogo, getUiText("app_title", "Namma Krishi Prices"))}</h1>
          <p class="hero-subcopy">${escapeHtml(getUiText("home_intro", "Search for commodity, market, or variety prices."))}</p>
          ${renderSearchField({ entryMode: "hero" })}
        </div>
      </section>
    `;
  }

  function renderSearchField({ autoFocus = false, canClose = false, entryMode = "overlay" } = {}) {
    const placeholderTerms = getSearchPlaceholderTerms();
    const hasQuery = Boolean(state.query.trim());
    return `
      <div class="search-field" data-search-root>
        <span class="search-submit" aria-hidden="true">
          <img class="search-icon" src="${escapeAttribute(ASSETS.search)}" alt="">
        </span>
        <div class="search-input-wrap${hasQuery ? " has-value" : ""}">
          <input
            type="text"
            autocomplete="off"
            enterkeyhint="search"
            placeholder=""
            value="${escapeAttribute(state.query)}"
            data-global-search="true"
            data-search-entry="${escapeAttribute(entryMode)}"
            ${autoFocus ? 'data-search-autofocus="true"' : ""}
            aria-label="${escapeAttribute(getUiText("search_label", "Search commodities, markets, or varieties"))}"
          >
          <span class="search-placeholder" aria-hidden="true">
            <span class="search-placeholder-label">${escapeHtml(getUiText("search_placeholder_prefix", "Search"))}</span>
            <span class="search-placeholder-terms">
              ${placeholderTerms.map((term) => `<span class="search-placeholder-item">${escapeHtml(term)}</span>`).join("")}
            </span>
          </span>
        </div>
        ${canClose ? `
          <button type="button" class="search-close" data-clear-search="true" aria-label="${escapeAttribute(getUiText("close_search_aria", "Close search"))}">
            <img src="${escapeAttribute(ASSETS.close)}" alt="">
          </button>
        ` : ""}
      </div>
    `;
  }

  function renderSearchOverlay() {
    if (!state.isSearchOpen) {
      return "";
    }

    const panelClass = state.route.view === "home" ? "home-search" : "results-search";
    const searchUiState = getSearchUiState();
    return `
      <div class="screen-overlay" data-close-search="true"></div>
      <div class="floating-search-panel ${panelClass}" data-search-root role="dialog" aria-modal="true" aria-label="${escapeAttribute(getUiText("search_label", "Search commodities, markets, or varieties"))}">
        ${renderSearchField({ autoFocus: true, canClose: true, entryMode: "overlay" })}
        <div class="search-suggestions-region ${searchUiState !== "hidden" ? "is-active" : ""} ${searchUiState === "ready" ? "is-scrollable" : ""}" data-search-suggestions>
          ${renderSearchOverlayContent(searchUiState)}
        </div>
      </div>
    `;
  }

  function renderSearchOverlayContent(searchUiState = getSearchUiState()) {
    if (searchUiState === "ready") {
      return renderSuggestions();
    }
    if (searchUiState === "loading") {
      return renderSearchLoadingState();
    }
    if (searchUiState === "empty") {
      return renderSearchEmptyState();
    }
    if (searchUiState === "unavailable") {
      return renderSearchUnavailableState();
    }
    return renderSearchIdleState();
  }

  function renderSearchIdleState() {
    return `
      <div class="search-state-panel search-idle-panel" aria-live="polite">
        <img class="empty-state-icon search-state-icon" src="${escapeAttribute(ASSETS.search)}" alt="" loading="lazy" decoding="async">
        <strong>${escapeHtml(getUiText("type_to_search", "Type to search"))}</strong>
        <p>${escapeHtml(getUiText("search_idle_body", "Type at least 3 characters to see matching suggestions."))}</p>
      </div>
    `;
  }

  function renderSearchLoadingState() {
    return `
      <div class="search-state-panel search-loading-panel" aria-live="polite">
        <span class="search-state-spinner" aria-hidden="true"></span>
        <strong>${escapeHtml(getUiText("search_loading_title", "Finding matching options..."))}</strong>
        <p>${escapeHtml(getUiText("search_loading_body", "Suggestions will appear here."))}</p>
      </div>
    `;
  }

  function renderSearchEmptyState() {
    return `
      <div class="search-state-panel search-empty-panel" aria-live="polite">
        <img class="empty-state-icon" src="${escapeAttribute(ASSETS.emptyState)}" alt="" loading="lazy" decoding="async">
        <strong>${escapeHtml(getUiText("no_matching_options", "No matching options."))}</strong>
        <p>${escapeHtml(getUiText("search_no_results_body", "Try a different commodity, market, or variety name."))}</p>
      </div>
    `;
  }

  function renderSearchUnavailableState() {
    return `
      <div class="search-state-panel search-unavailable-panel" aria-live="polite">
        <img class="empty-state-icon" src="${escapeAttribute(ASSETS.emptyState)}" alt="" loading="lazy" decoding="async">
        <strong>${escapeHtml(getUiText("search_unavailable_title", "Search is unavailable right now."))}</strong>
        <p>${escapeHtml(getUiText("search_unavailable_body", "We could not load suggestions. Please try again."))}</p>
        <button type="button" class="action-button ghost empty-state-button" data-retry-search-index="true">${escapeHtml(getUiText("retry", "Retry"))}</button>
      </div>
    `;
  }

  function renderCategorySection() {
    if (!state.categoryGroups.length) {
      return "";
    }

    const activeCategory = getActiveHomeCategory();
    if (!activeCategory) {
      return "";
    }

    return `
      <section class="category-section" aria-label="${escapeAttribute(getUiText("category_title", "Quick pick your commodity below."))}">
        <p class="section-copy">${escapeHtml(getUiText("category_title", "Quick pick your commodity below."))}</p>

        <div class="category-tabs" role="tablist" aria-label="${escapeAttribute(getUiText("category_title", "Commodity categories"))}" data-home-category-rail="true">
          ${state.categoryGroups.map((category) => {
            const isActive = category.id === state.activeHomeCategoryId;
            return `
              <button
                type="button"
                class="category-tab ${isActive ? "active" : ""}"
                data-home-category="${escapeAttribute(category.id)}"
                role="tab"
                aria-selected="${isActive ? "true" : "false"}"
              >
                <img src="${escapeAttribute(getCategoryThumb(category.id))}" alt="" loading="lazy" decoding="async">
                <span>${escapeHtml(getCategoryLabel(category.id, category.label))}</span>
              </button>
            `;
          }).join("")}
        </div>

        <section class="commodity-gallery">
          <div class="section-heading">
            <h2>${escapeHtml(getCategoryLabel(activeCategory.id, activeCategory.label))} (${escapeHtml(formatCountLabel(activeCategory.commodityCount, "commodity", "commodities"))})</h2>
          </div>
          <div class="commodity-grid" data-home-commodity-rail="true">
            ${activeCategory.commodities.map((commodity) => `
              <button
                type="button"
                class="commodity-tile"
                data-home-commodity="${escapeAttribute(commodity)}"
              >
                <div class="thumb-wrap ${escapeAttribute(getCommodityThumbWrapClass(commodity))}">
                  <img src="${escapeAttribute(getCommodityThumb(commodity))}" alt="${escapeAttribute(translateEntity("commodity", commodity))}" loading="lazy" decoding="async">
                </div>
                <p>${escapeHtml(translateEntity("commodity", commodity))}</p>
              </button>
            `).join("")}
          </div>
        </section>
      </section>
    `;
  }

  function renderResultsLayoutToggle() {
    return "";
  }

  function renderLocaleToggle() {
    return `
      <div class="locale-toggle language-toggle" role="group" aria-label="${escapeAttribute(getUiText("language_aria", "Language"))}">
        <button type="button" class="locale-toggle-button language-option ${state.locale === "en" ? "is-active active" : ""}" data-locale-toggle="en">EN</button>
        <button type="button" class="locale-toggle-button language-option ${state.locale === "kn" ? "is-active active" : ""}" data-locale-toggle="kn">${escapeHtml(getUiText("language_kannada", "Kannada").slice(0, 2).toUpperCase())}</button>
      </div>
    `;
  }

  function renderBrandHomeLink(extraClass = "", logoSrc = ASSETS.logo, logoAlt = getUiText("app_title", "Namma Krishi Prices")) {
    const appTitle = getUiText("app_title", "Namma Krishi Prices");
    const homeLabel = getUiText("home_button", "Home");
const classes = ["brand-inline", "brand-home-link", extraClass].filter(Boolean).join(" ");
    return `
      <a class="${escapeAttribute(classes)}" href="${escapeAttribute(buildRouteUrl(getHomeRoute()))}" data-home-link="true" aria-label="${escapeAttribute(homeLabel)}">
        <img class="brand-logo" src="${escapeAttribute(logoSrc)}" alt="${escapeAttribute(logoAlt || appTitle)}">
      </a>
    `;
  }

  function renderSiteFooter() {
    return `
      <footer class="app-footer">
        <div class="app-footer-inner">
          <div class="footer-brand-row">
            ${renderBrandHomeLink("footer-brand-link", ASSETS.logo, getUiText("footer_brand_aria", "Namma Krishi Prices home"))}
          </div>
          <p class="footer-disclaimer">${escapeHtml(getUiText("footer_disclaimer", "All prices are sourced from official websites, sources of which are mentioned on each commodity card"))}</p>
          <nav class="footer-links" aria-label="${escapeAttribute(getUiText("footer_nav_aria", "Footer links"))}">
            <a class="footer-link" href="https://prajavani.net" target="_blank" rel="noopener noreferrer">${escapeHtml(getUiText("footer_back_to_prajavani", "Back to Prajavani"))}</a>
            <span class="footer-link footer-link-muted" role="link" aria-disabled="true" title="${escapeAttribute(getUiText("footer_feedback_tooltip", "Coming soon"))}">${escapeHtml(getUiText("footer_submit_feedback", "Submit your feedback"))}</span>
          </nav>
        </div>
      </footer>
    `;
  }

  function renderTopBar() {
    if (state.route.view === "home") {
      return `
        <div class="topbar-left-slot">
          ${renderLocaleToggle()}
        </div>
        ${renderBrandHomeLink("topbar-brand-link")}
        ${state.showHomeTopbarSearch ? `
          <button type="button" class="icon-button topbar-search-trigger" data-open-search="true" aria-label="${escapeAttribute(getUiText("search_label", "Search commodities, markets, or varieties"))}">
            <img src="${escapeAttribute(ASSETS.search)}" alt="">
          </button>
        ` : ""}
      `;
    }

    return `
      <div class="topbar-left-slot">
        ${renderLocaleToggle()}
      </div>
      <div class="topbar-side-spacer" aria-hidden="true"></div>
      ${renderBrandHomeLink("topbar-brand-link results-brand-link")}
      <button type="button" class="icon-button topbar-search-trigger" data-open-search="true" aria-label="${escapeAttribute(getUiText("search_label", "Search commodities, markets, or varieties"))}">
        <img src="${escapeAttribute(ASSETS.search)}" alt="">
      </button>
    `;
  }

  function renderSuggestions() {
    return `
      <div class="search-suggestions">
        ${state.suggestions.map((result, index) => `
          <button type="button" class="suggestion-row" data-suggestion-index="${index}">
            <div class="thumb-wrap small ${escapeAttribute(getSuggestionDisplayType(result) === "market" && result.type === "market" ? "results-context-icon-market" : getCommodityThumbWrapClass(result.commodity))}">
              <img src="${escapeAttribute(result.type === "market" ? ASSETS.suggestionMarket : getCommodityThumb(result.commodity))}" alt="" loading="lazy" decoding="async">
            </div>
            <div class="suggestion-copy">
              <strong>${highlightMatch(getSuggestionLabel(result), state.query)}</strong>
              <span class="suggestion-kind ${escapeAttribute(getSuggestionToneClass(result))}">
                ${result.type === "market" ? "" : `<img src="${escapeAttribute(getSuggestionIcon(result))}" alt="" loading="lazy" decoding="async">`}
                ${escapeHtml(getSuggestionKindLabel(result))}
              </span>
            </div>
          </button>
        `).join("")}
      </div>
    `;
  }

  function getSuggestionIcon(value) {
    const type = getSuggestionDisplayType(value);
    if (type === "market") return ASSETS.suggestionMarket;
    if (type === "variety") return ASSETS.suggestionVariety;
    return ASSETS.suggestionCommodity;
  }

  function getSuggestionKindLabel(result) {
    if (isMarketCommoditySuggestion(result)) {
      return translateEntity("market", result.market);
    }
    if (result.type === "variety") {
      return translateEntity("commodity", result.commodity);
    }
    return getSuggestionTypeLabel(result);
  }

  function getSuggestionToneClass(value) {
    const type = getSuggestionDisplayType(value);
    if (type === "market") return "gold";
    if (type === "variety") return "blue";
    return "green";
  }

  function getFilterFieldToneClass(field) {
    if (field === "market") return "gold";
    if (field === "variety") return "blue";
    return "green";
  }

  function renderResultsToolbar(rows) {
    if (!state.context) {
      return "";
    }

    const activeFilterCount = getActiveFilterCount();
    return `
      <section class="results-toolbar ${activeFilterCount > 0 ? "has-filter-summary" : ""}">
        <div class="results-toolbar-inner">
          <div class="commodity-title">
            <div class="thumb-wrap large results-context-icon-${escapeAttribute(state.context.type)} ${escapeAttribute(state.context.type === "market" ? "" : getCommodityThumbWrapClass(state.route.commodity))}">
              <img src="${escapeAttribute(getResultsToolbarIcon())}" alt="">
            </div>
            <div class="toolbar-support">
              <h2>${escapeHtml(getResultsHeadingText())}</h2>
              <p class="results-count-copy">
                ${escapeHtml(getResultCountCopy(rows))}
                ${activeFilterCount > 0 ? ` • ${escapeHtml(String(activeFilterCount))} ${escapeHtml(getUiText("filters_label", "Filters"))}` : ""}
              </p>
            </div>
          </div>
          ${renderFilterLauncher()}
        </div>
        ${renderActiveFilterSummary()}
      </section>
    `;
  }

  function getResultsToolbarIcon() {
    if (state.context && state.context.type === "market") {
      return ASSETS.suggestionMarket;
    }
    return getCommodityThumb(state.route.commodity);
  }

  function getResultsHeadingText() {
    if (!state.context) {
      return "";
    }

    if (state.context.type === "commodity") {
      if (isMarketSearchCommodityView()) {
        return `${translateEntity("commodity", state.route.commodity || state.context.heading)} / ${translateEntity("market", state.route.market)}`;
      }
      return translateEntity("commodity", state.route.commodity || state.context.heading);
    }
    if (state.context.type === "market") {
      return translateEntity("market", state.route.market || state.context.heading);
    }
    if (state.context.type === "variety") {
      return `${translateEntity("commodity", state.route.commodity)} / ${translateEntity("variety", state.route.variety)}`;
    }
    return state.context.heading || "";
  }

  function getResultCountCopy(rows) {
    const count = Number(rows.length || 0).toLocaleString("en-IN");
    return `${count} ${rows.length === 1 ? "result" : "results"}`;
  }

  function getActiveFilterCount() {
    if (!state.context) {
      return 0;
    }

    return state.context.filters.reduce((count, field) => count + (state.filters[field] || []).length, 0);
  }

  function renderFilterLauncher() {
    if (!state.context || !state.context.filters.length) {
      return "";
    }

    const activeFilterCount = getActiveFilterCount();
    return `
      <button type="button" class="filter-button" data-open-filter-modal="true" aria-label="${escapeAttribute(getUiText("filter_open_aria", "Open filters"))}">
        <img src="${escapeAttribute(ASSETS.filter)}" alt="">
        <span class="filter-button-label">${escapeHtml(getUiText("filters_label", "Filters"))}</span>
        ${activeFilterCount > 0 ? `<span class="filter-count"><span class="filter-count-value">${activeFilterCount}</span></span>` : ""}
      </button>
    `;
  }

  function renderActiveFilterSummary() {
    if (!state.context) {
      return "";
    }

    const rows = state.context.filters
      .map((field) => ({
        field,
        values: (state.filters[field] || []).slice(),
      }))
      .filter((entry) => entry.values.length);

    if (!rows.length) {
      return "";
    }

    return `
      <section class="filter-summary">
        <div class="filter-summary-inner active-filter-summary" aria-label="${escapeAttribute(getUiText("filters_label", "Filters"))}">
          ${rows.map(({ field, values }) => `
            <div class="filter-summary-row ${escapeAttribute(field)}-filter-summary">
              <div class="filter-summary-label">
                <img src="${escapeAttribute(getSuggestionIcon(field))}" alt="" loading="lazy" decoding="async">
                <span>${escapeHtml(getFieldLabel(field))}</span>
              </div>
              <div class="chip-row filter-summary-chip-row">
                ${values.map((value) => `
                  <span class="filter-chip filter-chip-active ${escapeAttribute(getFilterFieldToneClass(field))}">
                    <span>${escapeHtml(translateEntity(field, value))}</span>
                    <button type="button" class="filter-chip-remove chip-close" data-remove-active-filter="${field}" data-remove-active-value="${escapeAttribute(value)}" aria-label="${escapeAttribute(`${getUiText("remove_value_prefix", "Remove")} ${getFieldLabel(field)} ${translateEntity(field, value)}`)}">&times;</button>
                  </span>
                `).join("")}
              </div>
            </div>
          `).join("")}
        </div>
      </section>
    `;
  }

  function renderFilterModal() {
    if (!state.context || !state.context.filters.length || !state.isFilterModalOpen) {
      return "";
    }

    return `
      <div class="screen-overlay filter-modal-backdrop" data-close-filter-modal="backdrop"></div>
      <section class="filter-dialog" role="dialog" aria-modal="true" aria-label="${escapeAttribute(getUiText("filters_label", "Filters"))}">
        <div class="dialog-header">
          <div>
            <h3>${escapeHtml(getUiText("refine_results", "Refine results"))}</h3>
          </div>
          <button type="button" class="icon-button close" data-close-filter-modal="button" aria-label="${escapeAttribute(getUiText("close_filters_aria", "Close filters"))}">
            <img src="${escapeAttribute(ASSETS.close)}" alt="" loading="lazy" decoding="async">
          </button>
        </div>
        <div class="filter-dialog-body" data-preserve-scroll-id="filter-modal-body">
          ${state.context.filters.map((field) => renderFilterField(field)).join("")}
        </div>
        <div class="action-row">
          <button type="button" class="action-button ghost" data-clear-filter-drafts="true">${escapeHtml(getUiText("clear_filters", "Clear Filters"))}</button>
          <button type="button" class="action-button solid" data-apply-filter-drafts="true">${escapeHtml(getUiText("apply_filters", "Apply Filters"))}</button>
        </div>
      </section>
    `;
  }

  function renderFilterField(field) {
    const selected = state.filterDrafts[field] || [];
    const options = getDraftFilterOptions(field, "");
    const isOpen = state.activeFilterField === field;
    const summary = getFilterTriggerSummary(field, selected);

    return `
      <div class="filter-group filter-modal-group">
        <div class="filter-line">
          <span class="filter-line-label ${escapeAttribute(getFilterFieldToneClass(field))}">
            ${field === "market" || field === "variety" ? `<img class="filter-line-icon" src="${escapeAttribute(getSuggestionIcon(field))}" alt="" aria-hidden="true" loading="lazy" decoding="async">` : ""}
            <span>${escapeHtml(getFieldLabel(field))}</span>
          </span>
          <span class="line"></span>
        </div>
        <button
          type="button"
          class="filter-trigger filter-dropdown-trigger"
          data-filter-toggle="${field}"
          aria-expanded="${isOpen ? "true" : "false"}"
        >
          <span class="filter-trigger-copy">
            <span class="filter-trigger-label">${escapeHtml(getUiText("tap_to_select", "Tap to Select"))}</span>
            <span class="filter-trigger-value">${escapeHtml(summary)}</span>
          </span>
          <span class="filter-chevron ${isOpen ? "expanded" : ""}" aria-hidden="true"></span>
        </button>
        <div class="option-list filter-search-results ${isOpen ? "is-open" : ""}" data-preserve-scroll-id="filter-search-results" data-filter-results="${field}" data-filter-field="${field}">
          ${isOpen ? (options.length ? options.map((value) => `
            <button
              type="button"
              class="option-row filter-search-option ${selected.includes(value) ? "selected is-selected" : ""}"
              data-toggle-draft-filter="${field}"
              data-toggle-draft-value="${escapeAttribute(value)}"
            >
              <span>${escapeHtml(translateEntity(field, value))}</span>
              <span class="checkbox-box">${selected.includes(value) ? '<span class="checkbox-check" aria-hidden="true"></span>' : ""}</span>
            </button>
          `).join("") : `<p class="filter-empty">${escapeHtml(getUiText("no_matching_options", "No matching options."))}</p>`) : ""}
        </div>
      </div>
    `;
  }

  function renderResults(rows) {
    if (!state.context) {
      return `
        <div class="empty-state empty-state-loading" aria-live="polite">
          <span class="search-state-spinner empty-state-spinner" aria-hidden="true"></span>
          <h3>${escapeHtml(getUiText("loading", "Loading..."))}</h3>
        </div>
      `;
    }

    if (!rows.length) {
      return `
        <div class="empty-state">
          <img class="empty-state-icon" src="${escapeAttribute(ASSETS.emptyState)}" alt="" loading="lazy" decoding="async">
          <h3>${escapeHtml(getUiText("filters_label", "Filters"))}</h3>
          <p>${escapeHtml(getUiText("no_rows_match", "No rows match the current combination."))}</p>
        </div>
      `;
    }

    if (getActiveResultsLayout() === "table") {
      return renderResultsTable(rows);
    }

    return renderResultsCards(rows);
  }

  function renderResultsCards(rows) {
    return `
      <div class="results-list">
        ${rows.map((row) => renderResultCard(row)).join("")}
      </div>
    `;
  }

  function renderResultCard(row) {
    const isExpanded = row.rowKey === state.expandedRowKey;
    const historyRows = isExpanded ? getHistoryRows(row) : [];
    const presentation = getCardPresentation(row);
    const previousRow = getPreviousComparableRow(row);
    const priceColumns = getRowPriceProfile(row).columns;
    const freshnessMeta = getFreshnessMeta(row.reportDate);
    const detailEntries = buildCardDetailEntries(row, previousRow, presentation);

    return `
      <article class="price-card result-card ${isExpanded ? "expanded is-expanded" : ""}" data-row-key="${escapeAttribute(row.rowKey)}" data-market-anchor="${escapeAttribute(row.market)}">
        <div class="card-header">
          <div class="card-market">
            <img class="card-title-icon card-title-icon-${escapeAttribute(presentation.titleKind)}" src="${escapeAttribute(getCardTitleIcon(presentation.titleKind, row.commodity))}" alt="" loading="lazy" decoding="async">
            <div class="card-title-stack">
              <h3>${escapeHtml(presentation.titleValue)}</h3>
            </div>
            <button type="button" class="card-share-button" data-share-card="${escapeAttribute(row.rowKey)}" aria-label="${escapeAttribute(getUiText("share_card", "Share"))}">
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M8.5 12.1 15.3 8.2M8.5 13.9l6.8 3.9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>
                <circle cx="6" cy="13" r="3" fill="#fff" stroke="currentColor" stroke-width="2"></circle>
                <circle cx="18" cy="6.5" r="3" fill="#fff" stroke="currentColor" stroke-width="2"></circle>
                <circle cx="18" cy="19.5" r="3" fill="#fff" stroke="currentColor" stroke-width="2"></circle>
              </svg>
            </button>
          </div>
        </div>

        <div class="card-status-row">
          <span class="card-source-label">${escapeHtml(`${getUiText("source_prefix", "Source")}: ${formatSourceName(row.sourceId)}`)}</span>
          <span class="status-pill status-pill-${escapeAttribute(freshnessMeta.tone)}">${escapeHtml(freshnessMeta.label)}</span>
        </div>

        <div class="stats-row" style="--stat-columns:${Math.min(priceColumns.length, 3)}">
          ${priceColumns.map((column) => `
            <div class="stat-block">
              <div class="stat-label">${renderPriceLabelForCard(column.kind, row)}</div>
              <div class="stat-value ${escapeAttribute(getStatTone(column.kind))}">${escapeHtml(formatCurrencyDisplay(row[column.key]))}</div>
              ${renderCardDelta(getPreviousPriceDelta(row, column.key, previousRow))}
            </div>
          `).join("")}
        </div>

        <div class="detail-grid">
          ${detailEntries.map((entry) => `
            <div class="meta-item">
              <div class="meta-label">${escapeHtml(entry.label)}</div>
              <div class="meta-value">${escapeHtml(entry.value)}${entry.subvalue ? `<span class="meta-subvalue"> ${escapeHtml(entry.subvalue)}</span>` : ""}</div>
            </div>
          `).join("")}
        </div>

        ${isExpanded ? `
          <div class="graph-panel result-card-history">
            ${renderHistory(row, historyRows)}
          </div>
        ` : ""}

        <button type="button" class="history-cta result-card-toggle" data-toggle-history="${escapeAttribute(row.rowKey)}" aria-expanded="${isExpanded ? "true" : "false"}">
          <span class="result-card-toggle-label">${escapeHtml(getUiText("see_price_history", "See Price History"))}</span>
          <span class="caret result-card-toggle-chevron"></span>
        </button>
      </article>
    `;
  }

  function buildCardShareUrl(row) {
    const route = {
      ...state.route,
      view: "table",
      layout: "cards",
      card: row.rowKey,
    };
    return new URL(buildRouteUrl(route), window.location.href).href;
  }

  function getCardSharePrice(row) {
    const firstColumn = getRowPriceProfile(row).columns[0];
    return firstColumn ? formatCurrencyDisplay(row[firstColumn.key]) : "-";
  }

  function getCardSharePayload(row) {
    const commodity = translateEntity("commodity", row.commodity);
    const market = translateEntity("market", row.market);
    const context = getResultsHeadingText() || commodity || market;
    const title = `${getUiText("app_title", "Namma Krishi Prices")}: ${context}`;
    const textParts = [commodity, market];
    if (row.variety && state.context && state.context.type === "variety") {
      textParts.push(translateEntity("variety", row.variety));
    }
    textParts.push(getCardSharePrice(row));
    return {
      title,
      text: textParts.filter(Boolean).join(" · "),
      url: buildCardShareUrl(row),
    };
  }

  async function shareResultCard(row) {
    const payload = getCardSharePayload(row);
    let nativeShareFailed = false;

    if (navigator.share) {
      try {
        await navigator.share(payload);
        return;
      } catch (error) {
        if (error && (error.name === "AbortError" || error.code === 20)) {
          return;
        }
        nativeShareFailed = true;
      }
    }

    if (!navigator.share || nativeShareFailed) {
      const copied = await copyTextToClipboard(payload.url);
      setShareFeedback(copied
        ? { tone: "success", message: getUiText("link_copied", "Link copied") }
        : { tone: "error", message: getUiText("unable_to_share", "Unable to share or copy the link") });
    }
  }

  async function copyTextToClipboard(text) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (error) {
        // Continue with the legacy fallback when Clipboard API access is denied.
      }
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    let copied = false;
    try {
      copied = typeof document.execCommand === "function" && document.execCommand("copy");
    } catch (error) {
      copied = false;
    }
    textarea.remove();
    return copied;
  }

  function setShareFeedback(feedback) {
    if (shareFeedbackTimer !== null) {
      window.clearTimeout(shareFeedbackTimer);
      shareFeedbackTimer = null;
    }
    state.shareFeedback = feedback;
    syncShareFeedbackNode();
    shareFeedbackTimer = window.setTimeout(() => {
      state.shareFeedback = null;
      shareFeedbackTimer = null;
      const feedbackNode = document.querySelector(".share-feedback");
      if (feedbackNode) {
        feedbackNode.remove();
      }
      scheduleRender();
    }, 2600);
  }

  function syncShareFeedbackNode() {
    if (!state.shareFeedback) {
      return;
    }

    let feedbackNode = document.querySelector(".share-feedback");
    if (!feedbackNode) {
      feedbackNode = document.createElement("div");
      feedbackNode.setAttribute("role", "status");
      feedbackNode.setAttribute("aria-live", "polite");
      document.body.appendChild(feedbackNode);
    }
    feedbackNode.className = `share-feedback share-feedback-${state.shareFeedback.tone || "success"}`;
    feedbackNode.textContent = state.shareFeedback.message;
  }

  function getCardTitleIcon(titleKind, commodity) {
    if (titleKind === "market") {
      return ASSETS.suggestionMarket;
    }
    if (titleKind === "variety") {
      return ASSETS.suggestionVariety;
    }
    return getCommodityThumb(commodity);
  }

  function getPriceLabelForCard(kind, row) {
    const unit = getPriceUnitLabel(row);
    const suffix = unit ? `/${unit}` : "";

    if (kind === "max") return `${getUiText("max_price_rs", "Maximum price")}${suffix}`;
    if (kind === "min") return `${getUiText("min_price_rs", "Minimum price")}${suffix}`;
    if (kind === "modal") return `${getUiText("modal_price_rs", "Modal price")}${suffix}`;
    return `${getUiText("max_price_rs", "Price")}${suffix}`;
  }

  function renderPriceLabelForCard(kind, row) {
    const label = getPriceLabelForCard(kind, row);
    const splitIndex = label.indexOf(" ");
    if (splitIndex === -1) {
      return `<span class="stat-label-line">${escapeHtml(label)}</span>`;
    }

    return `
      <span class="stat-label-line">${escapeHtml(label.slice(0, splitIndex))}</span>
      <span class="stat-label-line">${escapeHtml(label.slice(splitIndex + 1))}</span>
    `;
  }

  function getStatTone(kind) {
    if (kind === "min") return "blue";
    if (kind === "modal") return "gold";
    return "red";
  }

  function formatCurrencyDisplay(value) {
    if (value === null || value === undefined || value === "") {
      return "-";
    }
    return `₹${formatCurrency(value)}`;
  }

  function renderCardDelta(delta) {
    if (delta === null) {
      return `<div class="stat-delta flat"><span>-</span></div>`;
    }

    if (delta === 0) {
      return `<div class="stat-delta up"><span>₹ 0</span></div>`;
    }

    const isGain = delta > 0;
    return `
      <div class="stat-delta ${isGain ? "up" : "down"}">
        <span>₹ ${isGain ? "+" : "-"}${formatCurrency(Math.abs(delta))}</span>
        <span class="delta-icon">${isGain ? "▲" : "▼"}</span>
      </div>
    `;
  }

  function buildCardDetailEntries(row, previousRow, presentation) {
    const meta = presentation.meta.slice();
    const details = [
      ...meta,
      hasArrivalsData(row)
        ? { label: getUiText("arrivals_and_units", "Arrivals And Units"), value: formatNumber(row.arrivals), subvalue: row.unit }
        : null,
      { label: getUiText("latest_update", "Latest Update"), value: formatDateFull(row.reportDate) || "-" },
      { label: getUiText("previous_update", "Previous Update"), value: previousRow ? formatDateFull(previousRow.reportDate) : "-" },
    ].filter(Boolean);

    return details.slice(0, 5);
  }

  function renderCardDelta(delta) {
    if (delta === null) {
      return `
        <div class="stat-delta flat">
          <span class="stat-delta-content">
            <span class="stat-delta-value">-</span>
          </span>
        </div>
      `;
    }

    if (delta === 0) {
      return `
        <div class="stat-delta up">
          <span class="stat-delta-content">
            <span class="stat-delta-value">&#8377; 0</span>
          </span>
        </div>
      `;
    }

    const isGain = delta > 0;
    return `
      <div class="stat-delta ${isGain ? "up" : "down"}">
        <span class="stat-delta-content">
          <span class="stat-delta-value">&#8377; ${isGain ? "+" : "-"}${formatCurrency(Math.abs(delta))}</span>
          <span class="delta-icon" aria-hidden="true">${isGain ? "&#9650;" : "&#9660;"}</span>
        </span>
      </div>
    `;
  }

  function formatSourceName(sourceId) {
    const raw = String(sourceId || "krama").replaceAll("_", " ").trim();
    if (!raw) {
      return "Krama";
    }
    return raw.split(" ").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
  }

  function getFreshnessMeta(reportDate) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const then = new Date(`${normalizeReportDateValue(reportDate)}T00:00:00`);
    const diffDays = Number.isNaN(then.getTime()) ? 999 : Math.max(0, Math.floor((now.getTime() - then.getTime()) / 86400000));

    if (diffDays <= 2) {
      return { tone: "fresh", label: "Recently updated" };
    }
    if (diffDays <= 7) {
      return { tone: "aging", label: "Updated this week" };
    }
    return { tone: "stale", label: "Older update" };
  }

  function renderPriceDelta(delta) {
    if (delta === null) {
      return `<span class="price-delta price-delta-flat">${escapeHtml(getUiText("no_earlier_update", "No earlier update"))}</span>`;
    }

    if (delta === 0) {
      return `<span class="price-delta price-delta-flat"><span>₹ 0</span></span>`;
    }

    const isGain = delta > 0;
    return `
      <span class="price-delta ${isGain ? "price-delta-gain" : "price-delta-loss"}">
        <span>₹ ${isGain ? "+" : "-"}${formatCurrency(Math.abs(delta))}</span>
        ${renderDeltaIcon(isGain)}
      </span>
    `;
  }
})();
