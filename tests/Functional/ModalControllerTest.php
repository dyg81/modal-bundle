<?php

namespace Dyg81\ModalBundle\Tests\Functional;

use Dyg81\ModalBundle\Controller\ModalController;
use Dyg81\ModalBundle\Tests\Fixtures\app\AppKernel;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class ModalControllerTest extends WebTestCase
{
    protected static function getKernelClass()
    {
        return AppKernel::class;
    }

    public function testOpenMessageModalTranslatesKnownKey()
    {
        $client = static::createClient();
        $crawler = $client->request('GET', '/modal/open?key=modal.message.confirm.body');

        $this->assertSame(200, $client->getResponse()->getStatusCode());
        $this->assertGreaterThan(0, $crawler->filter('.modal')->count());
        $this->assertStringContainsString(
            'Are you sure you want to perform this action?',
            $crawler->filter('.modal-body')->first()->text()
        );
    }

    public function testOpenMessageModalHasAccessibleTitle()
    {
        $client = static::createClient();
        $crawler = $client->request('GET', '/modal/open?key=modal.message.info.title');

        $this->assertSame(200, $client->getResponse()->getStatusCode());

        $modal = $crawler->filter('div.modal')->first();
        $title = $crawler->filter('.modal-title')->first();

        $this->assertSame('Information', trim($title->text()));
        $this->assertSame($title->attr('id'), $modal->attr('aria-labelledby'));
        $this->assertSame('true', $modal->attr('aria-modal'));
    }

    public function testOpenConfirmModalReturnsModal()
    {
        $client = static::createClient();
        $crawler = $client->request('GET', '/modal/confirm');

        $this->assertSame(200, $client->getResponse()->getStatusCode());
        $this->assertGreaterThan(0, $crawler->filter('.modal')->count());
    }

    public function testOpenConfirmModalHasAccessibleTitle()
    {
        $client = static::createClient();
        $crawler = $client->request('GET', '/modal/confirm');

        $this->assertSame(200, $client->getResponse()->getStatusCode());

        $modal = $crawler->filter('div.modal')->first();
        $title = $crawler->filter('.modal-title')->first();

        $this->assertSame('Confirm action', trim($title->text()));
        $this->assertSame($title->attr('id'), $modal->attr('aria-labelledby'));
        $this->assertSame('true', $modal->attr('aria-modal'));
    }

    public function testModalBlocksAreNotRenderedTwice()
    {
        $client = static::createClient();
        $client->request('GET', '/modal/confirm');

        $html = $client->getResponse()->getContent();

        $this->assertSame(1, substr_count($html, 'Confirm action'));
        $this->assertSame(1, substr_count($html, 'modal-btn-confirm'));
    }

    public function testModalUsesBootstrap5CloseButtons()
    {
        $client = static::createClient();
        $client->request('GET', '/modal/confirm');

        $html = $client->getResponse()->getContent();

        $this->assertStringContainsString('class="btn-close" data-bs-dismiss="modal"', $html);
        $this->assertStringNotContainsString('data-dismiss="modal"', $html);
    }

    public function testMessageModalRejectsPost()
    {
        $client = static::createClient();
        $client->request('POST', '/modal/open?key=modal.message.confirm.body');

        $this->assertSame(405, $client->getResponse()->getStatusCode());
    }

    public function testMessageModalReturns404ForMissingKey()
    {
        $client = static::createClient();
        $client->request('GET', '/modal/open');

        $this->assertSame(404, $client->getResponse()->getStatusCode());
    }

    public function testMessageModalReturns404ForEmptyKey()
    {
        $client = static::createClient();
        $client->request('GET', '/modal/open?key=');

        $this->assertSame(404, $client->getResponse()->getStatusCode());
    }

    public function testMessageModalReturns404ForUnknownKey()
    {
        $client = static::createClient();
        $client->request('GET', '/modal/open?key=modal.does.not.exist');

        $this->assertSame(404, $client->getResponse()->getStatusCode());
    }
    public function testOpenMessageModalRendersArabicWithRtlAttributes(): void
    {
        $response = $this->renderMessageModal('ar', 'modal.message.info.title');

        $this->assertSame(200, $response->getStatusCode());
        $html = $response->getContent();
        $this->assertStringContainsString('lang="ar"', $html);
        $this->assertStringContainsString('dir="rtl"', $html);
        $this->assertStringContainsString('معلومات', $html);
    }

    public function testOpenMessageModalRendersHebrewWithRtlAttributes(): void
    {
        $response = $this->renderMessageModal('he', 'modal.message.confirm.title');

        $this->assertSame(200, $response->getStatusCode());
        $html = $response->getContent();
        $this->assertStringContainsString('lang="he"', $html);
        $this->assertStringContainsString('dir="rtl"', $html);
        $this->assertStringContainsString('אישור פעולה', $html);
    }

    public function testOpenMessageModalRendersEnglishLtr(): void
    {
        $response = $this->renderMessageModal('en', 'modal.message.info.title');

        $this->assertSame(200, $response->getStatusCode());
        $html = $response->getContent();
        $this->assertStringContainsString('lang="en"', $html);
        $this->assertStringContainsString('dir="ltr"', $html);
        $this->assertStringContainsString('Information', $html);
    }

    public function testOpenMessageModalRendersBcp47LanguageTagForRegionalLocale(): void
    {
        $response = $this->renderMessageModal('pt_BR', 'modal.message.info.title');

        $this->assertSame(200, $response->getStatusCode());
        $html = $response->getContent();
        $this->assertStringContainsString('lang="pt-BR"', $html);
        $this->assertStringContainsString('dir="ltr"', $html);
    }

    public function testOpenConfirmModalRendersRtlWhenLocaleIsArabic(): void
    {
        $response = $this->renderConfirmModal('ar');

        $this->assertSame(200, $response->getStatusCode());
        $html = $response->getContent();
        $this->assertStringContainsString('lang="ar"', $html);
        $this->assertStringContainsString('dir="rtl"', $html);
    }

    public function testRegionalRtlLocalesSetDirectionOnModalRoot(): void
    {
        foreach (['ar_SA' => 'ar-SA', 'he_IL' => 'he-IL'] as $locale => $language) {
            $response = $this->renderMessageModal($locale, 'modal.message.info.title');
            $crawler = new \Symfony\Component\DomCrawler\Crawler($response->getContent());
            $modal = $crawler->filter('div.modal')->first();

            $this->assertSame(200, $response->getStatusCode());
            $this->assertSame($language, $modal->attr('lang'));
            $this->assertSame('rtl', $modal->attr('dir'));
            static::ensureKernelShutdown();
        }
    }

    public function testModalDefaultsToEnglishWithoutRequest(): void
    {
        static::bootKernel();
        $container = static::getContainer();
        $html = $container->get('twig')->render('@Dyg81Modal/baseModal.html.twig');
        $crawler = new \Symfony\Component\DomCrawler\Crawler($html);
        $modal = $crawler->filter('div.modal')->first();

        $this->assertSame('en', $modal->attr('lang'));
        $this->assertSame('ltr', $modal->attr('dir'));
    }

    private function renderMessageModal(string $locale, string $key): Response
    {
        static::bootKernel();
        $container = static::getContainer();

        $request = Request::create('/modal/open?key='.$key);
        $request->setLocale($locale);

        $stack = $container->get('request_stack');
        $stack->push($request);

        try {
            $controller = new ModalController(
                $container->get('twig'),
                $container->get('translator')
            );

            return $controller->openMessageModalAction($request);
        } finally {
            $stack->pop();
        }
    }

    private function renderConfirmModal(string $locale): Response
    {
        static::bootKernel();
        $container = static::getContainer();

        $request = Request::create('/modal/confirm');
        $request->setLocale($locale);

        $stack = $container->get('request_stack');
        $stack->push($request);

        try {
            $controller = new ModalController(
                $container->get('twig'),
                $container->get('translator')
            );

            return $controller->openConfirmModalAction();
        } finally {
            $stack->pop();
        }
    }
}
