<?php

require __DIR__.'/../vendor/autoload.php';

use Twig\Environment;
use Twig\Loader\FilesystemLoader;
use Twig\TwigFilter;

$root = dirname(__DIR__);
$views = is_dir($root.'/Resources/views') ? $root.'/Resources/views' : $root.'/templates';
$translations = is_dir($root.'/Resources/translations') ? $root.'/Resources/translations' : $root.'/translations';
foreach (array('ar' => 'ar', 'he' => 'he', 'ar_SA' => 'ar-SA', 'he_IL' => 'he-IL', 'en' => 'en', 'pt_BR' => 'pt-BR') as $locale => $lang) {
    $twig = new Environment(new FilesystemLoader($views), array('strict_variables' => true));
    $twig->addFilter(new TwigFilter('trans', function ($text) { return $text; }));
    $app = new stdClass();
    $app->request = new stdClass();
    $app->request->locale = $locale;
    $twig->addGlobal('app', $app);
    $html = $twig->render('baseModal.html.twig');
    $dir = in_array(substr($lang, 0, 2), array('ar', 'he'), true) ? 'rtl' : 'ltr';
    if (false === strpos($html, 'lang="'.$lang.'"') || false === strpos($html, 'dir="'.$dir.'"')) {
        throw new RuntimeException('Wrong language or direction for '.$locale);
    }
}
$twig = new Environment(new FilesystemLoader($views), array('strict_variables' => true));
$twig->addFilter(new TwigFilter('trans', function ($text) { return $text; }));
$app = new stdClass();
$app->request = null;
$twig->addGlobal('app', $app);
$html = $twig->render('baseModal.html.twig');
if (false === strpos($html, 'lang="en"') || false === strpos($html, 'dir="ltr"')) {
    throw new RuntimeException('Wrong fallback without a request');
}
foreach (array('ar', 'he') as $locale) {
    $xml = new DOMDocument();
    if (!$xml->load($translations.'/messages.'.$locale.'.xlf')) {
        throw new RuntimeException('Invalid '.$locale.' catalogue');
    }
    $xpath = new DOMXPath($xml);
    $xpath->registerNamespace('x', 'urn:oasis:names:tc:xliff:document:1.2');
    foreach (array('modal.button.close', 'modal.button.confirm', 'modal.message.confirm.title', 'modal.message.confirm.body') as $key) {
        $nodes = $xpath->query('//x:trans-unit[@id="'.$key.'"]/x:target');
        if (1 !== $nodes->length || '' === trim($nodes->item(0)->textContent)) {
            throw new RuntimeException('Missing translation '.$key.' for '.$locale);
        }
    }
}
echo "RTL smoke tests passed\n";
