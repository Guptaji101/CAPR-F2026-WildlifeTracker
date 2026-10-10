<?php
// public/encyclopedia.php - Animal Encyclopedia: browse the best-known animals of each group in South Korea.
// All content is live: the list comes from GBIF (api/encyclopedia.php) and each card from
// api/species.php (GBIF taxonomy + Wikipedia summary, cached in species_cache).
$page = 'encyclopedia';

// Two small icons that Font Awesome Free doesn't have
$snail = '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor"><path d="M14 4a7 7 0 0 0-6.9 8.2C5.2 12.8 3 14 2 16h20a7 7 0 0 0-8-12zm0 3a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm0 2a1 1 0 1 0 0 2 1 1 0 0 0 0-2zM2 17.5c0 1.4 1.1 2.5 2.5 2.5h17v-2.5z"/></svg>';
$jelly = '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor"><path d="M12 3C7 3 3 6.6 3 11h18c0-4.4-4-8-9-8zM5 12.5c0 2 1.2 3 1.2 5S5 20 5.5 21c.6-.6 1.9-1.8 1.9-3.5S6.6 14 6.7 12.5zm4.2 0c0 2.5 1 3.5 1 6s-.5 2.5 0 3c.8-.5 1.6-1.6 1.6-3.5s-1-3.2-1-5.5zm4.3 0c0 2.3-1 3.6-1 5.5s.8 3 1.6 3.5c.5-.5 0-.5 0-3s1-3.5 1-6zm4.3 0c.1 1.5-.7 3.3-.7 5s1.3 2.9 1.9 3.5c.5-1 -.7-1.5-.7-3.5s1.2-3 1.2-5z"/></svg>';

$fa = fn($name) => '<i class="fa-solid ' . $name . '"></i>';

// The classification tree. "taxa" are GBIF taxon keys (the map uses the same keys for the
// five vertebrate groups); the descriptions are written for non-specialists.
$tree = [
    'Vertebrates' => [
        'text'   => 'Animals with a backbone.',
        'groups' => [
            'mammals'    => ['Mammals', 'Mammalia', '359', $fa('fa-paw'), '#f28c1b',
                'Warm-blooded animals with hair or fur. Almost all give birth to live young, and every mother feeds her young with milk.'],
            'birds'      => ['Birds', 'Aves', '212', $fa('fa-dove'), '#1d7fe0',
                'Warm-blooded animals with feathers and a beak but no teeth. All of them lay hard-shelled eggs, and most can fly.'],
            'reptiles'   => ['Reptiles', 'Squamata · Testudines · Crocodylia', '11592253,11418114,11493978', $fa('fa-dragon'), '#43a047',
                'Cold-blooded animals with dry, scaly skin: lizards, snakes, turtles and crocodiles. Most lay their eggs on land.'],
            'amphibians' => ['Amphibians', 'Amphibia', '131', $fa('fa-frog'), '#8b3fd9',
                'Cold-blooded animals with moist skin, such as frogs, toads and salamanders. Most start life in water as larvae (tadpoles) and later move onto land.'],
            'fish'       => ['Fish', 'Actinopterygii · Elasmobranchii', '204,121', $fa('fa-fish'), '#17a2c6',
                'Cold-blooded animals that live in water and breathe with gills. This group covers ray-finned fish (most fish) and sharks and rays.'],
        ],
    ],
    'Invertebrates' => [
        'text'   => 'Animals without a backbone — about 97% of all animal species.',
        'groups' => [
            'insects'     => ['Insects', 'Insecta', '216', $fa('fa-bug'), '#e03131',
                'Six legs and a body in three parts: head, thorax and abdomen. The largest group of animals on Earth, including beetles, butterflies, bees and ants.'],
            'arachnids'   => ['Spiders & relatives', 'Arachnida', '367', $fa('fa-spider'), '#a61e4d',
                'Eight legs and no antennae or wings: spiders, scorpions, ticks and mites. Most are hunters.'],
            'crustaceans' => ['Crabs & shrimps', 'Malacostraca', '229', $fa('fa-shrimp'), '#e8590c',
                'Mostly water animals with a hard outer shell and many jointed legs, such as crabs, shrimps, lobsters and woodlice.'],
            'molluscs'    => ['Snails & shellfish', 'Mollusca', '52', $snail, '#8d6e63',
                'Soft-bodied animals, many protected by a shell: snails, slugs, clams, mussels, squid and octopuses.'],
            'worms'       => ['Segmented worms', 'Annelida', '42', $fa('fa-worm'), '#d6336c',
                'Long bodies made of ring-like segments and no legs, such as earthworms, leeches and bristle worms.'],
            'cnidarians'  => ['Jellyfish & corals', 'Cnidaria', '43', $jelly, '#7048e8',
                'Simple sea animals with stinging cells on their tentacles: jellyfish, corals and sea anemones.'],
            'echinoderms' => ['Starfish & urchins', 'Echinodermata', '50', $fa('fa-star'), '#f59f00',
                'Sea animals whose bodies are usually built in five parts around a centre: starfish, sea urchins and sea cucumbers.'],
        ],
    ],
];
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Animal Encyclopedia &mdash; WildTrack</title>

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" integrity="sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA==" crossorigin="anonymous" referrerpolicy="no-referrer" />

    <!-- ?v=file time makes browsers fetch the new file after every change -->
    <link rel="stylesheet" href="css/style.css?v=<?= filemtime(__DIR__ . '/css/style.css') ?>">
    <link rel="stylesheet" href="css/encyclopedia.css?v=<?= filemtime(__DIR__ . '/css/encyclopedia.css') ?>">
</head>
<body>

<?php include __DIR__ . '/partials/header.php'; ?>

    <div class="ency-layout">

        <!-- Left: classification tree -->
        <aside class="sidebar">
            <section class="side-section">
                <h3 class="side-title"><i class="fa-solid fa-earth-asia"></i> Animals of South Korea</h3>
                <p class="tree-note">Each group lists the species with the most GBIF records in South Korea.</p>
            </section>

            <?php foreach ($tree as $division => $d): ?>
            <section class="side-section">
                <h3 class="side-title"><i class="fa-solid fa-sitemap"></i> <?= $division ?></h3>
                <p class="tree-note"><?= $d['text'] ?></p>
                <div class="tree">
                    <?php foreach ($d['groups'] as $key => [$name, $latin, $taxa, $icon, $color, $desc]): ?>
                    <button class="tree-item" type="button" data-key="<?= $key ?>" data-division="<?= $division ?>"
                            data-name="<?= htmlspecialchars($name) ?>" data-latin="<?= htmlspecialchars($latin) ?>"
                            data-taxa="<?= $taxa ?>" data-color="<?= $color ?>" data-desc="<?= htmlspecialchars($desc) ?>">
                        <span class="tree-icon" style="color:<?= $color ?>;background:<?= $color ?>1f"><?= $icon ?></span>
                        <?= htmlspecialchars($name) ?>
                    </button>
                    <?php endforeach; ?>
                </div>
            </section>
            <?php endforeach; ?>
        </aside>

        <!-- Main: group introduction and species cards -->
        <main class="ency-main">
            <section class="card group-intro" id="group-intro">
                <div class="crumbs" id="crumbs">Animals</div>
                <div class="intro-head">
                    <span class="intro-icon" id="intro-icon"></span>
                    <div>
                        <h1 id="intro-name">Animal Encyclopedia</h1>
                        <p class="intro-latin" id="intro-latin"></p>
                    </div>
                </div>
                <p class="intro-desc" id="intro-desc"></p>
                <p class="intro-facts" id="intro-facts"></p>
            </section>

            <section class="species-grid" id="species-grid" aria-live="polite"></section>
            <p class="ency-credit">Lists and record counts: GBIF.org. Summaries: Wikipedia (CC BY-SA). Photos: GBIF media or Wikimedia Commons.</p>
        </main>
    </div>

    <!-- Species detail (opens when a card is clicked) -->
    <dialog id="species-dialog" class="species-dialog">
        <button class="dialog-close" type="button" title="Close" onclick="this.closest('dialog').close()"><i class="fa-solid fa-xmark"></i></button>
        <div id="species-detail"></div>
    </dialog>

    <script src="js/encyclopedia.js?v=<?= filemtime(__DIR__ . '/js/encyclopedia.js') ?>"></script>
</body>
</html>
