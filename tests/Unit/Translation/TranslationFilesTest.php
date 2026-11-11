<?php

namespace Dyg81\ModalBundle\Tests\Unit\Translation;

use PHPUnit\Framework\TestCase;

class TranslationFilesTest extends TestCase
{
    public const DEFAULT_LOCALE = 'en';
    public const EXPECTED_LOCALES = ['de', 'en', 'es', 'fr', 'ja', 'pt_BR'];

    public function testSupportedLocalesHaveTranslationFiles()
    {
        $this->assertSame(self::EXPECTED_LOCALES, array_keys($this->getTranslationFiles()));
    }

    public function testTranslationFilesUseBcp47LanguageTags()
    {
        foreach ($this->getTranslationFiles() as $locale => $file) {
            $translation = $this->parseFile($file);

            $this->assertSame('en', $translation['sourceLanguage'], sprintf('Unexpected source language in "%s".', $file));
            $this->assertSame(str_replace('_', '-', $locale), $translation['targetLanguage'], sprintf('Unexpected target language in "%s".', $file));
        }
    }

    public function testEveryLocaleUsesTheSameTranslationKeysAsTheDefaultLocale()
    {
        $files = $this->getTranslationFiles();
        $defaultKeys = array_keys($this->parseFile($files[self::DEFAULT_LOCALE])['messages']);
        sort($defaultKeys);

        foreach ($files as $locale => $file) {
            $messages = $this->parseFile($file)['messages'];
            $keys = array_keys($messages);
            sort($keys);

            $this->assertSame($defaultKeys, $keys, sprintf('Translation keys for "%s" differ from "%s".', $locale, self::DEFAULT_LOCALE));

            foreach ($messages as $key => $message) {
                $this->assertNotSame('', $message, sprintf('Empty translation for "%s" in "%s".', $key, $locale));
            }
        }
    }

    public function testPlaceholdersPluralsAndFormatTypesMatchTheDefaultLocale()
    {
        $files = $this->getTranslationFiles();
        $defaultMessages = $this->parseFile($files[self::DEFAULT_LOCALE])['messages'];

        foreach ($files as $locale => $file) {
            if (self::DEFAULT_LOCALE === $locale) {
                continue;
            }

            $messages = $this->parseFile($file)['messages'];

            foreach ($defaultMessages as $key => $defaultMessage) {
                $this->assertSame(
                    $this->getMessageTokens($defaultMessage),
                    $this->getMessageTokens($messages[$key]),
                    sprintf('Placeholders, plural forms or format types for "%s" differ in "%s".', $key, $locale)
                );
            }
        }
    }

    private function getTranslationFiles()
    {
        $files = glob(__DIR__.'/../../../Resources/translations/Dyg81ModalBundle.*.xlf') ?: [];
        sort($files);

        $translations = [];
        foreach ($files as $file) {
            $locale = substr(basename($file, '.xlf'), \strlen('Dyg81ModalBundle.'));
            $translations[$locale] = $file;
        }

        return $translations;
    }

    private function parseFile($file)
    {
        $document = new \DOMDocument();
        $previous = libxml_use_internal_errors(true);
        $loaded = $document->load($file);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        $this->assertTrue($loaded, sprintf('Cannot parse "%s".', $file));

        $xpath = new \DOMXPath($document);
        $xpath->registerNamespace('xliff', 'urn:oasis:names:tc:xliff:document:1.2');

        $fileNode = $xpath->query('/xliff:xliff/xliff:file')->item(0);
        if (!$fileNode instanceof \DOMElement) {
            $this->fail(sprintf('Missing <file> element in "%s".', $file));
        }

        $messages = [];
        foreach ($xpath->query('./xliff:body/xliff:trans-unit', $fileNode) as $unit) {
            if (!$unit instanceof \DOMElement) {
                $this->fail(sprintf('Invalid <trans-unit> element in "%s".', $file));
            }

            $id = $unit->getAttribute('id');
            $target = $xpath->query('./xliff:target', $unit)->item(0);

            $this->assertArrayNotHasKey($id, $messages, sprintf('Duplicate key "%s" in "%s".', $id, $file));
            $this->assertNotNull($target, sprintf('Missing <target> for "%s" in "%s".', $id, $file));

            $messages[$id] = trim($target->textContent);
        }

        return [
            'sourceLanguage' => $fileNode->getAttribute('source-language'),
            'targetLanguage' => $fileNode->getAttribute('target-language'),
            'messages' => $messages,
        ];
    }

    private function getMessageTokens($message)
    {
        $tokens = [];

        if (preg_match_all('/%([a-zA-Z_][a-zA-Z0-9_]*)%/', $message, $matches)) {
            foreach ($matches[1] as $name) {
                $tokens[] = '%'.$name.'%';
            }
        }

        if (preg_match_all('/\{\s*([a-zA-Z_][a-zA-Z0-9_]*|\d+)\s*(?:,\s*([a-zA-Z]+))?/', $message, $matches, PREG_SET_ORDER)) {
            foreach ($matches as $match) {
                $tokens[] = isset($match[2]) && '' !== $match[2] ? $match[2].'('.$match[1].')' : 'argument('.$match[1].')';
            }
        }

        if (preg_match('/\{\s*[a-zA-Z_][a-zA-Z0-9_]*\s*,\s*plural\s*,/', $message) || false !== strpos($message, '|')) {
            $tokens[] = 'plural';
        }

        if (preg_match_all('/::\s*currency\/([A-Z]{3})/', $message, $matches)) {
            foreach ($matches[1] as $currency) {
                $tokens[] = 'currency('.$currency.')';
            }
        }

        $tokens = array_values(array_unique($tokens));
        sort($tokens);

        return $tokens;
    }
}
