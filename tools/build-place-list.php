<?php
/**
 * build-place-list.php — makes public/data/korea-places.json, the built-in list of South Korean
 * places that api/places.php uses when Photon cannot be reached (16 Nov 2026: Photon refuses
 * connections from the shared Render servers, so place suggestions were empty on the live site).
 *
 * For each name below it asks the local api/places.php (so the places are filtered and shaped
 * exactly like live suggestions) and keeps the results whose name starts with that name.
 * Run it on a PC where Photon works, with XAMPP's Apache running:
 *
 *   /c/xampp/php/php.exe tools/build-place-list.php
 *
 * Then commit public/data/korea-places.json. About 250 requests, a short pause between them
 * (Photon fair use); takes a few minutes.
 */

const LOCAL_API = 'http://localhost/CAPR-F2026-WildlifeTracker/public/api/places.php?q=';

// Provinces and big cities, cities, counties with much nature, national parks, and well-known
// places for wildlife (mountains, islands, wetlands, rivers, city parks)
const NAMES = [
    // provinces and metropolitan cities
    'Seoul', 'Busan', 'Daegu', 'Incheon', 'Gwangju', 'Daejeon', 'Ulsan', 'Sejong', 'Gyeonggi',
    'Gangwon', 'North Chungcheong', 'South Chungcheong', 'North Jeolla', 'Jeonbuk', 'South Jeolla',
    'North Gyeongsang', 'South Gyeongsang', 'Jeju',
    // cities
    'Suwon', 'Seongnam', 'Goyang', 'Yongin', 'Bucheon', 'Ansan', 'Anyang', 'Namyangju', 'Hwaseong',
    'Pyeongtaek', 'Uijeongbu', 'Siheung', 'Paju', 'Gimpo', 'Gwangmyeong', 'Gunpo', 'Hanam', 'Osan',
    'Icheon', 'Anseong', 'Guri', 'Pocheon', 'Yangju', 'Dongducheon', 'Gwacheon', 'Uiwang', 'Yeoju',
    'Chuncheon', 'Wonju', 'Gangneung', 'Donghae', 'Taebaek', 'Sokcho', 'Samcheok', 'Cheongju',
    'Chungju', 'Jecheon', 'Cheonan', 'Gongju', 'Boryeong', 'Asan', 'Seosan', 'Nonsan', 'Gyeryong',
    'Dangjin', 'Jeonju', 'Gunsan', 'Iksan', 'Jeongeup', 'Namwon', 'Gimje', 'Mokpo', 'Yeosu',
    'Suncheon', 'Naju', 'Gwangyang', 'Pohang', 'Gyeongju', 'Gimcheon', 'Andong', 'Gumi', 'Yeongju',
    'Yeongcheon', 'Sangju', 'Mungyeong', 'Gyeongsan', 'Changwon', 'Jinju', 'Tongyeong', 'Sacheon',
    'Gimhae', 'Miryang', 'Geoje', 'Yangsan', 'Jeju City', 'Seogwipo',
    // counties
    'Yangpyeong', 'Gapyeong', 'Yeoncheon', 'Hongcheon', 'Hoengseong', 'Yeongwol', 'Pyeongchang',
    'Jeongseon', 'Cheorwon', 'Hwacheon', 'Yanggu', 'Inje', 'Goseong', 'Yangyang', 'Danyang',
    'Goesan', 'Boeun', 'Okcheon', 'Yeongdong', 'Taean', 'Buyeo', 'Seocheon', 'Muju', 'Jinan',
    'Imsil', 'Sunchang', 'Gochang', 'Buan', 'Damyang', 'Gurye', 'Goheung', 'Boseong', 'Hwasun',
    'Jangheung', 'Gangjin', 'Haenam', 'Wando', 'Jindo', 'Sinan', 'Yeonggwang', 'Uljin', 'Yeongdeok',
    'Cheongsong', 'Ulleung', 'Bonghwa', 'Hapcheon', 'Hadong', 'Sancheong', 'Hamyang', 'Namhae',
    'Geochang', 'Changnyeong', 'Ganghwa', 'Ongjin', 'Gijang', 'Ulju', 'Dalseong',
    // districts of the big cities (several cities have a Jung-gu, Dong-gu, Nam-gu…)
    'Jung-gu', 'Dong-gu', 'Seo-gu', 'Nam-gu', 'Buk-gu', 'Haeundae', 'Suyeong', 'Saha', 'Yeongdo',
    'Gangnam', 'Gangseo', 'Gangdong', 'Mapo', 'Jongno', 'Yongsan', 'Songpa', 'Nowon', 'Eunpyeong',
    'Gwanak', 'Seocho', 'Dobong', 'Seongbuk', 'Dalseo', 'Suseong', 'Yuseong', 'Michuhol', 'Yeonsu',
    'Bupyeong', 'Gyeyang',
    // national parks
    'Jirisan', 'Gyeongju National Park', 'Gyeryongsan', 'Hallyeohaesang', 'Seoraksan', 'Songnisan',
    'Hallasan', 'Naejangsan', 'Gayasan', 'Deogyusan', 'Odaesan', 'Juwangsan', 'Taeanhaean',
    'Dadohaehaesang', 'Bukhansan', 'Chiaksan', 'Woraksan', 'Sobaeksan', 'Byeonsanbando',
    'Wolchulsan', 'Mudeungsan', 'Taebaeksan', 'Palgongsan',
    // mountains, islands, wetlands, rivers and parks known for wildlife
    'Suncheon Bay', 'Upo', 'Junam', 'Nakdong', 'Eulsukdo', 'Han River', 'Geum River', 'Seomjin',
    'Taehwa', 'Ganghwado', 'Udo', 'Marado', 'Geomundo', 'Dokdo', 'Baengnyeongdo', 'Ulleungdo',
    'Hongdo', 'Heuksando', 'Gageodo', 'Seongsan', 'Namsan', 'Gwanaksan', 'Dobongsan', 'Inwangsan',
    'Suraksan', 'Yongmasan', 'Achasan', 'Cheonggyesan', 'Gwanggyosan', 'Geumjeongsan', 'Jangsan',
    'Apsan', 'Gayasan', 'Biseulsan', 'Sinbulsan', 'Gajisan', 'Yeongnam Alps', 'Munjangdae',
    'Ilsan Lake', 'Olympic Park', 'Seoul Forest', 'Haneul Park', 'Gwangneung', 'Cheonsuman',
    'Hwaseong Lake', 'Siwha', 'Saemangeum', 'Suncheonman', 'Gangjin Bay', 'Haenam Peninsula',
    'Dongbaekseom', 'Taejongdae', 'Igidae', 'Daewangam', 'Ganjeolgot', 'Jangsaengpo',
];

$all = [];
$seen = [];
foreach (NAMES as $i => $name) {
    $raw = @file_get_contents(LOCAL_API . rawurlencode($name));
    $places = $raw ? (json_decode($raw, true)['places'] ?? []) : [];
    $kept = 0;
    foreach ($places as $p) {
        // Only the place meant (its name starts with the searched name), at most 2 per name
        // (a district such as Jung-gu exists in several cities: up to 5 of them)
        $max = str_contains($name, '-gu') ? 5 : 2;
        if (stripos($p['name'], explode(' ', $name)[0]) !== 0 || $kept === $max) continue;
        $id = mb_strtolower($p['name'] . '|' . $p['area']);
        if (isset($seen[$id])) continue;
        $seen[$id] = true;
        $all[] = $p;
        $kept++;
    }
    fwrite(STDOUT, sprintf("%3d/%d %-24s %d\n", $i + 1, count(NAMES), $name, $kept));
    usleep(300000);   // a short pause: Photon is a free service
}

$file = __DIR__ . '/../public/data/korea-places.json';
file_put_contents($file, json_encode($all, JSON_UNESCAPED_UNICODE));
fwrite(STDOUT, count($all) . " places written to public/data/korea-places.json\n");
