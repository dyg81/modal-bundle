<?php

declare(strict_types=1);

namespace Dyg81\ModalBundle\Tests\Functional;

final class ModalControllerTest extends FunctionalTestCase
{
    public function testRoutesUseTheConfiguredPrefix(): void
    {
        self::bootKernel();
        $router = self::getContainer()->get('router');

        self::assertSame('/modal/open/hello', $router->generate('dyg81_modal_open_message', ['message' => 'hello']));
        self::assertSame('/modal/confirm', $router->generate('dyg81_modal_open_confirm'));
    }

    public function testConfirmModalIsRendered(): void
    {
        $client = static::createClient();
        $client->request('GET', '/modal/confirm');

        self::assertResponseIsSuccessful();
        self::assertSelectorExists('#base-modal.modal');
        self::assertSelectorExists('.modal-btn-confirm');
    }

    public function testMessageModalShowsTheMessage(): void
    {
        $client = static::createClient();
        $client->request('GET', '/modal/open/Hello');

        self::assertResponseIsSuccessful();
        self::assertSelectorTextContains('.modal-body', 'Hello');
    }

    public function testMessageIsEscaped(): void
    {
        $client = static::createClient();
        $client->request('GET', '/modal/open/'.rawurlencode('<b>bold'));

        self::assertResponseIsSuccessful();
        $content = (string) $client->getResponse()->getContent();
        self::assertStringNotContainsString('<b>bold', $content);
        self::assertStringContainsString('&lt;b&gt;bold', $content);
    }

    public function testRoutesOnlyAcceptGet(): void
    {
        $client = static::createClient();
        $client->request('POST', '/modal/confirm');

        self::assertResponseStatusCodeSame(405);
    }
}
